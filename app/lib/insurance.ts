/**
 * Client-side shapes and wording for the insurance enquiry flow.
 *
 * This is a REFERRAL workflow: Progressive AutoHub is not an insurer. Workflow
 * RULES (which move is allowed, what the customer may do next) are NOT copied
 * here — NestJS returns `nextStatuses`, `canRespond`, `canClose` and
 * `canFollowUp` on every enquiry. Only wording lives in this file.
 */

export const COVER_TYPES = ["NEW", "RENEWAL", "COMPREHENSIVE", "THIRD_PARTY", "ADD_ON"] as const;
export type CoverType = (typeof COVER_TYPES)[number];

export const COVER_TYPE_LABEL: Record<string, string> = {
  NEW: "New policy",
  RENEWAL: "Renewal",
  COMPREHENSIVE: "Comprehensive",
  THIRD_PARTY: "Third-party",
  ADD_ON: "Add-on / extra coverage",
};

export const COVER_TYPE_HINT: Record<string, string> = {
  NEW: "You don't have a policy yet, or are buying for a new car.",
  RENEWAL: "Your current policy is ending (or has ended) and you'd like to renew.",
  COMPREHENSIVE: "Covers damage to your own car as well as third-party liability.",
  THIRD_PARTY: "The legal minimum: covers harm to other people and their property only.",
  ADD_ON: "Extra protection on top of a policy, such as zero depreciation or engine cover.",
};

export const EXISTING_INSURANCE_OPTIONS = [
  { value: "UNKNOWN", label: "I'm not sure" },
  { value: "NONE", label: "I have no policy" },
  { value: "ACTIVE", label: "I have an active policy" },
  { value: "EXPIRED", label: "My policy has expired" },
] as const;

export const CONTACT_PREFERENCES = [
  { value: "PHONE", label: "Phone call" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "EMAIL", label: "Email" },
] as const;

export const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Enquiry submitted",
  UNDER_REVIEW: "Under review",
  PARTNER_ASSIGNED: "Partner assigned",
  QUOTE_RECEIVED: "Quote received",
  CUSTOMER_CONTACTED: "We've contacted you",
  ACCEPTED: "You accepted a quote",
  DECLINED: "You declined",
  CLOSED: "Closed",
};

/** Plain-language "what happens next". No promised response times. */
export const STATUS_HINT: Record<string, string> = {
  SUBMITTED: "We have your enquiry. A person will review it and pass it to an insurance partner.",
  UNDER_REVIEW: "Our team is reviewing your enquiry and choosing a suitable partner.",
  PARTNER_ASSIGNED: "Your enquiry has been passed to a partner. They will contact you with options.",
  QUOTE_RECEIVED: "A partner has sent a quote. Review it below and tell us what you'd like to do.",
  CUSTOMER_CONTACTED: "We (or the partner) have been in touch. If you haven't heard anything, ask for a follow-up.",
  ACCEPTED: "You've told us you want to proceed. The partner will take it from here — any policy is issued by them, not by us.",
  DECLINED: "You declined this quote. You can close the enquiry or start a new one.",
  CLOSED: "This enquiry is closed.",
};

export const statusLabel = (s: string) => STATUS_LABEL[s] ?? s;

export interface InsurancePartnerPublic {
  id: number;
  name: string;
  description: string | null;
  products: string[];
  cities: string[];
  website: string | null;
  licenceNote: string | null;
}

export interface InsuranceTimelineEvent {
  at: string;
  kind: "SUBMITTED" | "STATUS" | "ASSIGNED" | "QUOTE" | "FOLLOW_UP" | "NOTE";
  label: string;
  detail?: string;
}

export interface InsuranceEnquiryDto {
  id: number;
  referenceNo: string;
  status: string;
  coverType: string;
  customerName: string;
  city: string | null;
  registrationNo: string | null;
  registrationYear: number | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  existingInsurance: string;
  policyExpiry: string | null;
  contactPreference: string;
  message: string | null;
  partnerName: string | null;
  partner?: {
    name: string;
    phone: string;
    email: string | null;
    website: string | null;
    licenceNote: string | null;
  } | null;
  /** A partner-supplied figure — informational until the partner issues a policy. */
  quote: { amount: number; notes: string | null; receivedAt: string | null } | null;
  followUpRequested: boolean;
  createdAt: string;
  nextStatuses: string[];
  canRespond: boolean;
  canClose: boolean;
  canFollowUp: boolean;
  timeline?: InsuranceTimelineEvent[];
}

export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(d);
}

export function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(d);
}
