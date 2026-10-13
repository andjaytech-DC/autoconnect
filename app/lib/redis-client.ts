import { connect as connectTcp, type Socket } from "node:net";
import { connect as connectTls } from "node:tls";

/**
 * A minimal, dependency-free Redis client.
 *
 * The rate limiter needs a store shared by every app instance, and Redis is the
 * usual answer — but a hard `ioredis`/`redis` dependency would mean the whole
 * app fails to start (or the build fails to resolve `node:net`) in an
 * environment that has no Redis at all. Instead this speaks just enough RESP to
 * run one atomic Lua script, and every caller treats a Redis failure as "no
 * shared store" and falls back to the in-process limiter. Redis therefore stays
 * an optional accelerator, never a required service.
 *
 * Only two commands are needed by the limiter: `EVAL` and `PING`. Anything else
 * belongs in a real client, not here.
 */

export type RedisReply =
  | string
  | number
  | null
  | RedisReply[]
  | { error: string };

export interface RedisTarget {
  host: string;
  port: number;
  tls: boolean;
  username?: string;
  password?: string;
  db: number;
}

/**
 * Parse a `redis://` or `rediss://` URL.
 *
 * Returns `null` for anything else, including an empty or malformed value, so a
 * deployment that forgets to set `REDIS_URL` simply runs without a shared
 * store rather than crashing at boot.
 */
export function parseRedisUrl(raw: string | undefined | null): RedisTarget | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  const tls = url.protocol === "rediss:";
  if (url.protocol !== "redis:" && !tls) return null;

  const port = url.port
    ? Number.parseInt(url.port, 10)
    : 6379;
  if (!Number.isInteger(port) || port <= 0 || port > 65535) return null;

  const dbRaw = url.pathname.replace(/^\//, "");
  const db = dbRaw === "" ? 0 : Number.parseInt(dbRaw, 10);
  if (!Number.isInteger(db) || db < 0) return null;

  return {
    host: url.hostname,
    port,
    tls,
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db,
  };
}

/**
 * Decode one RESP reply from `buffer` starting at `offset`.
 *
 * Returns `null` when the buffer does not yet contain a whole reply — Redis is
 * free to split a reply across TCP segments, so a partial read is normal, not an
 * error. `next` is the offset just past the decoded value.
 */
export function parseResp(
  buffer: Buffer,
  offset = 0,
): { value: RedisReply; next: number } | null {
  if (offset >= buffer.length) return null;
  const type = buffer[offset];
  const lineEnd = buffer.indexOf("\r\n", offset);
  if (lineEnd === -1) return null;
  const line = buffer.toString("utf8", offset + 1, lineEnd);

  switch (type) {
    case 0x2b: // '+' simple string
      return { value: line, next: lineEnd + 2 };
    case 0x2d: // '-' error
      return { value: { error: line }, next: lineEnd + 2 };
    case 0x3a: // ':' integer
      return { value: Number(line), next: lineEnd + 2 };
    case 0x24: {
      // '$' bulk string
      const length = Number(line);
      if (length === -1) return { value: null, next: lineEnd + 2 };
      if (!Number.isInteger(length) || length < 0) {
        throw new Error(`Malformed RESP bulk length: ${line}`);
      }
      const start = lineEnd + 2;
      const end = start + length;
      if (buffer.length < end + 2) return null;
      return { value: buffer.toString("utf8", start, end), next: end + 2 };
    }
    case 0x2a: {
      // '*' array
      const count = Number(line);
      if (count === -1) return { value: null, next: lineEnd + 2 };
      if (!Number.isInteger(count) || count < 0) {
        throw new Error(`Malformed RESP array length: ${line}`);
      }
      const items: RedisReply[] = [];
      let cursor = lineEnd + 2;
      for (let i = 0; i < count; i += 1) {
        const parsed = parseResp(buffer, cursor);
        if (!parsed) return null;
        items.push(parsed.value);
        cursor = parsed.next;
      }
      return { value: items, next: cursor };
    }
    default:
      throw new Error(`Unexpected RESP type byte 0x${type.toString(16)}`);
  }
}

/** Encode a command as a RESP array of bulk strings. */
export function encodeCommand(args: Array<string | number>): Buffer {
  const parts: Buffer[] = [Buffer.from(`*${args.length}\r\n`, "utf8")];
  for (const arg of args) {
    const bytes = Buffer.from(String(arg), "utf8");
    parts.push(Buffer.from(`$${bytes.length}\r\n`, "utf8"), bytes, Buffer.from("\r\n", "utf8"));
  }
  return Buffer.concat(parts);
}

export function isRedisError(reply: RedisReply): reply is { error: string } {
  return (
    typeof reply === "object" &&
    reply !== null &&
    !Array.isArray(reply) &&
    "error" in reply
  );
}

interface PendingCommand {
  resolve: (reply: RedisReply) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

export interface RedisClientOptions {
  /** Per-command timeout in milliseconds. */
  timeoutMs?: number;
  /** Injectable connector, so tests can point at a fake server. */
  target: RedisTarget;
}

/**
 * A single-connection RESP client that serialises commands and fails every
 * in-flight caller when the connection drops.
 */
export class RedisClient {
  private readonly target: RedisTarget;
  private readonly timeoutMs: number;
  private socket: Socket | null = null;
  private connecting: Promise<void> | null = null;
  private buffer = Buffer.alloc(0);
  private readonly pending: PendingCommand[] = [];
  private closed = false;

  constructor(options: RedisClientOptions) {
    this.target = options.target;
    this.timeoutMs = options.timeoutMs ?? 2000;
  }

  private ensureConnected(): Promise<void> {
    if (this.closed) return Promise.reject(new Error("Redis client closed"));
    if (this.socket && !this.socket.destroyed) return Promise.resolve();
    if (this.connecting) return this.connecting;

    this.connecting = new Promise<void>((resolve, reject) => {
      const { host, port, tls } = this.target;
      const onConnect = () => {
        this.connecting = null;
        // AUTH / SELECT must complete before any queued command is sent.
        this.handshake().then(resolve, reject);
      };
      const onError = (error: Error) => {
        this.connecting = null;
        this.failAll(error);
        reject(error);
      };

      const socket = tls
        ? connectTls({ host, port, timeout: this.timeoutMs }, onConnect)
        : connectTcp({ host, port }, onConnect);

      socket.setNoDelay(true);
      socket.setTimeout(this.timeoutMs, () => {
        onError(new Error("Redis connection timed out"));
        socket.destroy();
      });
      socket.once("error", onError);
      socket.on("data", (chunk) => this.onData(chunk));
      socket.on("close", () => this.failAll(new Error("Redis connection closed")));
      this.socket = socket;
    });

    return this.connecting;
  }

  private async handshake(): Promise<void> {
    if (this.target.password) {
      const authArgs: Array<string | number> = this.target.username
        ? ["AUTH", this.target.username, this.target.password]
        : ["AUTH", this.target.password];
      const auth = await this.send(authArgs);
      if (isRedisError(auth)) throw new Error(`Redis AUTH failed: ${auth.error}`);
    }
    if (this.target.db !== 0) {
      const select = await this.send(["SELECT", this.target.db]);
      if (isRedisError(select)) throw new Error(`Redis SELECT failed: ${select.error}`);
    }
  }

  private onData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.pending.length > 0) {
      let parsed: { value: RedisReply; next: number } | null;
      try {
        parsed = parseResp(this.buffer, 0);
      } catch (error) {
        this.failAll(error as Error);
        this.socket?.destroy();
        return;
      }
      if (!parsed) break;
      this.buffer = this.buffer.subarray(parsed.next);
      const command = this.pending.shift();
      command?.resolve(parsed.value);
    }
  }

  private failAll(error: Error): void {
    while (this.pending.length > 0) {
      const command = this.pending.shift();
      if (!command) break;
      clearTimeout(command.timer);
      command.reject(error);
    }
    this.buffer = Buffer.alloc(0);
  }

  /** Send one command and wait for its reply. */
  private send(args: Array<string | number>): Promise<RedisReply> {
    return new Promise<RedisReply>((resolve, reject) => {
      this.ensureConnected().then(
        () => {
          if (!this.socket || this.socket.destroyed) {
            reject(new Error("Redis socket unavailable"));
            return;
          }
          const timer = setTimeout(() => {
            reject(new Error("Redis command timed out"));
            this.socket?.destroy();
          }, this.timeoutMs);
          this.pending.push({ resolve, reject, timer });
          this.socket.write(encodeCommand(args));
        },
        (error: Error) => reject(error),
      );
    });
  }

  /** Run `EVAL` and return the raw reply. */
  async eval(
    script: string,
    keys: string[],
    args: Array<string | number>,
  ): Promise<RedisReply> {
    return this.send(["EVAL", script, keys.length, ...keys, ...args]);
  }

  async ping(): Promise<boolean> {
    const reply = await this.send(["PING"]);
    return reply === "PONG";
  }

  close(): void {
    this.closed = true;
    this.failAll(new Error("Redis client closed"));
    this.socket?.destroy();
    this.socket = null;
  }
}
