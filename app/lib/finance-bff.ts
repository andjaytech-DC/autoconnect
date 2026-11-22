import { backendFetch } from "@/app/lib/backend";

/** A finance application as NestJS returns it after create + submit. */
export interface BackendFinanceApplication {
  id: number;
  referenceNo: string;
  status: string;
  vehicleId?: number | null;
  loanAmount: number;
  tenureMonths: number;
  downPayment?: number | null;
  monthlyIncome?: number | null;
  createdAt: string;
}

export interface FinanceApplicationInput {
  vehicleId?: number;
  loanAmount: number;
  tenureMonths: number;
  downPayment?: number;
  monthlyIncome?: number;
}

/**
 * Create a finance application in NestJS and submit it for review.
 *
 * The backend models these as two steps (DRAFT, then SUBMITTED). Every caller
 * here wants the application in front of an underwriter, so the two calls live
 * together; if the second fails the draft remains on the customer's account and
 * the error is surfaced to the caller unchanged.
 */
export async function submitFinanceApplication(
  token: string,
  input: FinanceApplicationInput,
): Promise<BackendFinanceApplication> {
  const created = await backendFetch<BackendFinanceApplication>(
    "/finance/applications",
    { method: "POST", token, body: input },
  );
  return backendFetch<BackendFinanceApplication>(
    `/finance/applications/${created.id}/submit`,
    { method: "POST", token },
  );
}
