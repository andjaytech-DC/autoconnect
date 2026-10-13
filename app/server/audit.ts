import { resolveClientIp } from "@/app/lib/client-ip";
import { prisma } from "@/app/server/prisma";

/**
 * Append-only audit log for sensitive actions. Failures are swallowed so
 * that logging never breaks the primary operation â€” but they are written
 * to the server console for observability.
 */
export async function audit(params: {
    userId?: string | null;
    action: string;
    entity: string;
    entityId?: string | number | null;
    metadata?: Record<string, unknown>;
    ipAddress?: string | null;
  }): Promise<void> {
    try {
      // AuditLog.userId is a required integer and AuditLog.entityId is a
      // required string, so a caller without either cannot be recorded.
      const userId = Number.parseInt(params.userId ?? "", 10);
      if (!Number.isInteger(userId) || params.entityId == null) {
        console.error("Audit log skipped: missing userId or entityId", params.action, params.entity);
        return;
      }
      // `metadata` is stored as text, not JSON.
      const metadata =
        params.metadata === undefined ? null : JSON.stringify(params.metadata);
      await prisma.auditLog.create({
        data: {
          userId,
          action: params.action,
          entity: params.entity,
          entityId: String(params.entityId),
          metadata,
        },
      });
      if (params.ipAddress) {
        // Recorded on the console because the table has no IP column.
        console.debug(`audit ${params.action} ${params.entity} from ${params.ipAddress}`);
      }
    } catch (error) {
      console.error("Audit log write failed:", error);
    }
  }

/**
 * Best-effort client IP for audit records. Uses the same trust rules as the
 * rate limiter: proxy headers are only honoured behind an explicitly configured
 * trusted proxy, so an untrusted caller cannot fabricate the recorded address.
 */
export function clientIp(request: Request): string | undefined {
  const { ip, trusted } = resolveClientIp(request);
  return trusted ? ip : undefined;
}
