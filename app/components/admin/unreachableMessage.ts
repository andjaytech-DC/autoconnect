import { ApiError } from '@/app/lib/nest-public';

/**
 * One message for "we could not reach the backend", shared by the admin panels.
 *
 * These panels previously used `try { … } finally { … }` with no `catch`, so a
 * backend outage or throttle escaped as an unhandledRejection — visible in the
 * console as `ApiError: Backend unreachable` from lib/nest.ts, with the panel
 * left blank and no explanation on screen.
 *
 * The distinction that matters: an `ApiError` with a real status is the backend
 * answering (and its message is worth showing verbatim), whereas status 0 means
 * the request never got an answer.
 */
export function unreachableMessage(err: unknown): string {
  if (err instanceof ApiError && err.status !== 0) return err.message;
  return 'Unable to load data. Please check your connection and try again.';
}
