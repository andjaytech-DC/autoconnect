/**
 * Client IP resolution for rate limiting and audit records.
 *
 * `x-forwarded-for` and `x-real-ip` are ordinary request headers, so any client
 * that can reach the app directly controls them. Rotating them on every request
 * was previously enough to escape every rate limit in this file (the limiter
 * read `x-forwarded-for` unconditionally).
 *
 * Proxy headers are therefore honoured only when the deployment says a trusted
 * proxy sits in front of the app and is the party that wrote them:
 *
 *   TRUST_PROXY_HEADERS=true   honour XFF / X-Real-IP (Vercel, ALB, CloudFront,
 *                              nginx in front of `next start`)
 *   TRUST_PROXY_HEADERS=false  ignore them — all callers share one bucket
 *   unset                      true in development, false in production
 *
 * `TRUSTED_PROXIES` is an optional, comma-separated list of proxy IPs or CIDR
 * blocks. When it is set, an XFF chain is only trusted if its last hop is one
 * of those addresses; a misconfigured deployment therefore degrades to the
 * safe "unidentified" bucket instead of trusting attacker input.
 */

/** Returned when the caller's address cannot be established without trusting
 *  client-supplied headers. Never used as an authorization input. */
export const UNIDENTIFIED_IP = "unidentified";

export interface ClientIpResult {
  /** Bucket key for per-caller limits. */
  ip: string;
  /**
   * True when `ip` came from a proxy header the deployment vouches for.
   * When false, `ip` is `UNIDENTIFIED_IP` and the caller must be treated as
   * indistinguishable from every other caller.
   */
  trusted: boolean;
}

function envFlag(name: string): boolean | undefined {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return undefined;
  const normalized = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return undefined; // unparseable value → fall through to the default
}

/**
 * Whether proxy-supplied client headers may be trusted.
 *
 * Defaults are deliberate: development needs them to keep per-client buckets
 * working behind `next dev`, while production must opt in explicitly so a
 * directly-exposed app can never be rate-limit-bypassed by a header.
 */
export function trustProxyHeaders(): boolean {
  const explicit = envFlag("TRUST_PROXY_HEADERS");
  if (explicit !== undefined) return explicit;
  return process.env.NODE_ENV !== "production";
}

/** Parse `TRUSTED_PROXIES` into a list of trimmed entries. */
export function trustedProxies(): string[] {
  return (process.env.TRUSTED_PROXIES ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = value * 256 + octet;
  }
  return value;
}

function matchesCidr(ip: string, cidr: string): boolean {
  const [range, prefixRaw] = cidr.split("/");
  const prefix = prefixRaw === undefined ? null : Number(prefixRaw);
  if (prefix === null) return ip === cidr;
  if (!Number.isInteger(prefix) || prefix < 0) return false;

  const address = ipv4ToInt(ip);
  const network = ipv4ToInt(range);
  if (address === null || network === null) return false;
  if (prefix === 0) return true;
  if (prefix > 32) return false;

  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  return ((address & mask) >>> 0) === ((network & mask) >>> 0);
}

/** True when the last hop of an XFF chain is a configured trusted proxy. */
export function isTrustedProxyHop(ip: string): boolean {
  const proxies = trustedProxies();
  if (proxies.length === 0) return false;
  return proxies.some((entry) =>
    entry.includes("/") ? matchesCidr(ip, entry) : ip === entry,
  );
}

function isPrivateAddress(ip: string): boolean {
  return (
    ip === "::1" ||
    ip === "127.0.0.1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip.startsWith("fc") ||
    ip.startsWith("fd")
  );
}

/**
 * Resolve the caller's address.
 *
 * When proxy headers are not trusted the result is `UNIDENTIFIED_IP`, which is
 * still correct for rate limiting — all such callers share one bucket — and is
 * strictly safer than honouring a header the client controls.
 */
export function resolveClientIp(request: Request): ClientIpResult {
  if (!trustProxyHeaders()) return { ip: UNIDENTIFIED_IP, trusted: false };

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded
      .split(",")
      .map((hop) => hop.trim())
      .filter(Boolean);
    if (hops.length > 0) {
      // A proxy appends, so the original client is the left-most hop. When
      // TRUSTED_PROXIES is configured the chain must end at a known proxy,
      // otherwise the whole chain is discarded as untrustworthy.
      const lastHop = hops[hops.length - 1];
      if (trustedProxies().length === 0 || isTrustedProxyHop(lastHop)) {
        const client = hops[0];
        // Loopback/private claims are never a caller identity; two different
        // hosts behind NAT would otherwise collide on one bucket.
        if (!isPrivateAddress(client)) return { ip: client, trusted: true };
      }
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp && !isPrivateAddress(realIp)) {
    return { ip: realIp, trusted: true };
  }

  return { ip: UNIDENTIFIED_IP, trusted: false };
}
