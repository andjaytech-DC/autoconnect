/**
 * Frontend-facing type aliases for the /api/dealers endpoints.
 * The canonical Dealer interface lives in app/data/dealers.ts; these types
 * describe the JSON envelope returned by the API handlers so that consumers
 * stay in sync with the wire format.
 */

import type { Dealer } from "@/app/data/dealers";

/** Response shape for GET /api/dealers */
export interface DealersListResponse {
  dealers: Dealer[];
  total: number;
  cities: string[];
}

/** Response shape for GET /api/dealers/[id] */
export interface DealerResponse {
  dealer: Dealer;
}

/** Error shape returned with 4xx/5xx responses */
export interface DealerApiError {
  error: string;
  code: string;
}
