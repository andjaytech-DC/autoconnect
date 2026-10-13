import { NextResponse } from "next/server";

type Handler = (
  request: Request,
) => NextResponse | Promise<NextResponse>;

interface GuardOptions {
  /** Log prefix, e.g. "api/dealer/finance". */
  route: string;
}

/**
 * Wrap a route handler so an unexpected exception becomes a clean JSON 500
 * (never Next.js's HTML error page — which would crash client `.json()`
 * parsers with "Unexpected end of JSON input"), logged with the route context.
 *
 * Usage — export the wrapped function as the route handler:
 *
 *   const handler: Handler = async (request) => { ... return NextResponse.json({}) };
 *   export const GET = withErrorGuard(handler, { route: "api/dealer/finance" });
 *
 * Every future API route should be wrapped here instead of hand-rolling a
 * try/catch, so error handling stays in one place.
 */
export function withErrorGuard(
  handler: Handler,
  { route }: GuardOptions,
): (request: Request) => Promise<NextResponse> {
  return async (request) => {
    try {
      return await handler(request);
    } catch (err) {
      console.error(`[${route}] unexpected error:`, err);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}