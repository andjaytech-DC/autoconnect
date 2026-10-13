"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { Combobox } from "@/app/components/sell/Combobox";
import { INDIAN_STATES } from "@/app/data/india-states";
import {
  CONDITION_OPTIONS,
  FUEL_TYPES,
  modelsForMake,
  OWNERSHIP_OPTIONS,
  TRANSMISSION_TYPES,
  VEHICLE_MAKES,
} from "@/app/data/vehicle-catalog";

const fieldCls =
  "w-full rounded-lg border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] px-3 py-2.5 text-sm text-[hsl(var(--color-content))] outline-none transition focus:border-[hsl(var(--color-primary))] focus:ring-2 focus:ring-[hsl(var(--color-focus)/0.4)] aria-[invalid=true]:border-[hsl(var(--color-error))] disabled:cursor-not-allowed disabled:opacity-60";

const STEPS = [
  { id: 1, title: "Identify the car", hint: "Brand, model and variant" },
  { id: 2, title: "Condition", hint: "Usage and ownership" },
  { id: 3, title: "Contact", hint: "Where to send the request" },
] as const;

interface FormState {
  make: string;
  model: string;
  variant: string;
  year: string;
  fuel: string;
  transmission: string;
  mileage: string;
  ownership: string;
  state: string;
  city: string;
  condition: string;
  expectedPrice: string;
  ownerName: string;
  phone: string;
  email: string;
  consent: boolean;
  registration: string;
}

const initialState = (registration: string): FormState => ({
  make: "",
  model: "",
  variant: "",
  year: "",
  fuel: "",
  transmission: "",
  mileage: "",
  ownership: "",
  state: "",
  city: "",
  condition: "",
  expectedPrice: "",
  ownerName: "",
  phone: "",
  email: "",
  consent: false,
  registration,
});

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function digitsOf(value: string): string {
  return value.replace(/\D/g, "");
}

type Errors = Partial<Record<keyof FormState, string>>;

function validateStep1(form: FormState): Errors {
  const errors: Errors = {};
  if (!form.make.trim()) errors.make = "Select or type the manufacturer.";
  else if (!form.model.trim()) errors.model = "Select or type the model.";
  const year = Number(form.year);
  if (!form.year.trim()) errors.year = "Enter the manufacturing year.";
  else if (!Number.isInteger(year) || year < 1980 || year > new Date().getFullYear() + 1) {
    errors.year = "Enter a valid year between 1980 and next year.";
  }
  if (!form.fuel) errors.fuel = "Choose a fuel type.";
  if (!form.transmission) errors.transmission = "Choose a transmission.";
  return errors;
}

function validateStep2(form: FormState): Errors {
  const errors: Errors = {};
  const mileage = Number(form.mileage);
  if (!form.mileage.trim()) errors.mileage = "Enter the kilometres driven.";
  else if (!Number.isFinite(mileage) || mileage < 0) errors.mileage = "Enter a valid distance.";
  if (!form.ownership) errors.ownership = "Select the ownership.";
  if (!form.state) errors.state = "Select the registration state.";
  if (!form.city.trim()) errors.city = "Enter the registration city.";
  if (!form.condition) errors.condition = "Select the overall condition.";
  if (form.expectedPrice.trim()) {
    const price = Number(form.expectedPrice);
    if (!Number.isFinite(price) || price < 0) errors.expectedPrice = "Enter a valid amount.";
  }
  return errors;
}

function validateStep3(form: FormState): Errors {
  const errors: Errors = {};
  if (!form.ownerName.trim()) errors.ownerName = "Enter your name.";
  const phone = digitsOf(form.phone);
  if (!phone) errors.phone = "Enter your mobile number.";
  else if (phone.length !== 10 && !(phone.length === 12 && phone.startsWith("91"))) {
    errors.phone = "Enter a valid 10-digit mobile number.";
  }
  if (form.email.trim() && !isEmail(form.email.trim())) errors.email = "Enter a valid email.";
  if (!form.consent) errors.consent = "Please accept the privacy notice to continue.";
  return errors;
}

interface SellFormProps {
  /** Registration number carried over from the homepage quick-valuation form (`/sell?q=…`). */
  initialRegistration?: string;
}

/**
 * "Get a free valuation" — three-step intake form posting to /api/sell-listings.
 *
 * This is a lead-generation flow: the backend stores the request for a human to
 * review. It does not calculate a price, so the confirmation is worded as a
 * received request ("indicative offer after review"), never a guaranteed or
 * instant valuation.
 */
export default function SellForm({ initialRegistration = "" }: SellFormProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<FormState>(() => initialState(initialRegistration));
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState(false);
  const stepRef = useRef<HTMLDivElement>(null);
  const submittingRef = useRef(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Changing the make invalidates the dependent model.
      if (key === "make" && value !== prev.make) next.model = "";
      return next;
    });
  }

  function goToStep(next: 1 | 2 | 3, nextErrors: Errors = {}) {
    setStep(next);
    setErrors(nextErrors);
    requestAnimationFrame(() => stepRef.current?.focus());
  }

  function next() {
    const validation = step === 1 ? validateStep1(form) : validateStep2(form);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    goToStep(step === 1 ? 2 : 3);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submittingRef.current) return; // block duplicate submissions

    const step1Errors = validateStep1(form);
    const step2Errors = validateStep2(form);
    const validation = { ...step1Errors, ...step2Errors, ...validateStep3(form) };
    if (Object.keys(validation).length > 0) {
      if (Object.keys(step1Errors).length) goToStep(1, validation);
      else if (Object.keys(step2Errors).length) goToStep(2, validation);
      else setErrors(validation);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/sell-listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerName: form.ownerName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          vehicleData: {
            make: form.make.trim(),
            model: form.model.trim(),
            variant: form.variant.trim() || undefined,
            year: Number(form.year),
            mileage: Number(form.mileage),
            expectedPrice: form.expectedPrice.trim() ? Number(form.expectedPrice) : 0,
            city: form.city.trim(),
            state: form.state || undefined,
            fuel: form.fuel || undefined,
            transmission: form.transmission || undefined,
            ownership: form.ownership || undefined,
            condition: form.condition || undefined,
            registration: form.registration.trim() || undefined,
          },
        }),
      });
      if (res.ok) {
        setDone(true);
      } else if (res.status === 429) {
        setSubmitError("You've submitted a few requests already. Please wait a minute and try again.");
      } else {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setSubmitError(body.error || "We couldn't submit your request. Please try again.");
      }
    } catch {
      setSubmitError("Network error. Check your connection and try again.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <section
        id="sell-form"
        aria-label="Valuation request received"
        className="mt-12 rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] p-6 lg:p-8"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/12">
            <CheckCircle2 size={20} className="text-[hsl(var(--color-success))]" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-[hsl(var(--color-content))]">
              Valuation request received
            </h2>
            <p className="mt-2 text-sm leading-6 text-[hsl(var(--color-content-muted))]">
              Thanks, {form.ownerName.trim().split(" ")[0] || "there"}. Our team will review your{" "}
              <strong className="font-semibold text-[hsl(var(--color-content))]">
                {form.year} {form.make} {form.model}
              </strong>{" "}
              details and contact you on {form.phone} within 24 hours with an indicative offer.
            </p>
            <p className="mt-3 text-xs leading-5 text-[hsl(var(--color-content-muted))]">
              This is a valuation request, not an instant or guaranteed price. The final offer
              depends on a physical inspection and market conditions.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="sell-form"
      aria-label="Get a free valuation"
      className="mt-12 rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] p-5 sm:p-6 lg:p-8"
    >
      <h2 className="text-xl font-bold text-[hsl(var(--color-content))]">Get a free valuation</h2>
      <p className="mt-1 text-sm text-[hsl(var(--color-content-muted))]">
        Three short steps. Our dealers review your details and call you back with an indicative
        offer.
      </p>

      {/* Progress indicator */}
      <ol className="mt-5 flex items-center gap-2" aria-label="Valuation progress">
        {STEPS.map((entry, index) => {
          const isCurrent = entry.id === step;
          const isDone = entry.id < step;
          return (
            <li key={entry.id} className="flex flex-1 items-center gap-2">
              <span
                aria-current={isCurrent ? "step" : undefined}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isCurrent
                    ? "bg-[hsl(var(--color-primary))] text-[hsl(var(--color-primary-foreground))]"
                    : isDone
                      ? "bg-emerald-500/15 text-[hsl(var(--color-success))]"
                      : "bg-[hsl(var(--color-surface-strong))] text-[hsl(var(--color-content-muted))]"
                }`}
              >
                {isDone ? <CheckCircle2 size={14} aria-hidden="true" /> : entry.id}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-xs font-bold ${
                    isCurrent
                      ? "text-[hsl(var(--color-content))]"
                      : "text-[hsl(var(--color-content-muted))]"
                  }`}
                >
                  {entry.title}
                </span>
                <span className="hidden truncate text-[11px] text-[hsl(var(--color-content-muted))] sm:block">
                  {entry.hint}
                </span>
              </span>
              {index < STEPS.length - 1 && (
                <span
                  className={`hidden h-px flex-1 sm:block ${
                    isDone ? "bg-[hsl(var(--color-success))]/40" : "bg-[hsl(var(--color-line))]"
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>

      <form onSubmit={submit} noValidate className="mt-6">
        {submitError && (
          <p
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-lg border border-[hsl(var(--color-error))]/40 bg-[hsl(var(--color-error))]/8 px-3 py-2.5 text-sm text-[hsl(var(--color-error))]"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            {submitError}
          </p>
        )}

        <div ref={stepRef} tabIndex={-1} className="space-y-4 outline-none">
          {step === 1 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="vf-make" className="mb-1.5 block text-xs font-bold text-[hsl(var(--color-content))]">
                    Manufacturer <span className="text-[hsl(var(--color-error))]">*</span>
                  </label>
                  <Combobox
                    id="vf-make"
                    label="Manufacturer"
                    value={form.make}
                    onChange={(value) => update("make", value)}
                    options={VEHICLE_MAKES}
                    placeholder="e.g. Maruti Suzuki"
                    required
                    invalid={Boolean(errors.make)}
                    describedBy={errors.make ? "vf-make-error" : undefined}
                  />
                  {errors.make && (
                    <p id="vf-make-error" className="mt-1 text-xs text-[hsl(var(--color-error))]">
                      {errors.make}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="vf-model" className="mb-1.5 block text-xs font-bold text-[hsl(var(--color-content))]">
                    Model <span className="text-[hsl(var(--color-error))]">*</span>
                  </label>
                  <Combobox
                    id="vf-model"
                    label="Model"
                    value={form.model}
                    onChange={(value) => update("model", value)}
                    options={form.make ? modelsForMake(form.make) : []}
                    placeholder={form.make ? "e.g. Swift" : "Choose a manufacturer first"}
                    required
                    invalid={Boolean(errors.model)}
                    describedBy={errors.model ? "vf-model-error" : undefined}
                  />
                  {errors.model && (
                    <p id="vf-model-error" className="mt-1 text-xs text-[hsl(var(--color-error))]">
                      {errors.model}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="vf-variant" className="mb-1.5 block text-xs font-bold text-[hsl(var(--color-content))]">
                    Variant / trim <span className="font-normal text-[hsl(var(--color-content-muted))]">(optional)</span>
                  </label>
                  <input
                    id="vf-variant"
                    value={form.variant}
                    onChange={(event) => update("variant", event.target.value)}
                    maxLength={80}
                    placeholder="e.g. ZXi+"
                    className={fieldCls}
                  />
                </div>
                <div>
                  <label htmlFor="vf-year" className="mb-1.5 block text-xs font-bold text-[hsl(var(--color-content))]">
                    Year <span className="text-[hsl(var(--color-error))]">*</span>
                  </label>
                  <input
                    id="vf-year"
                    type="number"
                    inputMode="numeric"
                    min={1980}
                    max={new Date().getFullYear() + 1}
                    value={form.year}
                    onChange={(event) => update("year", event.target.value)}
                    aria-invalid={Boolean(errors.year) || undefined}
                    aria-describedby={errors.year ? "vf-year-error" : undefined}
                    placeholder="e.g. 2021"
                    className={fieldCls}
                  />
                  {errors.year && (
                    <p id="vf-year-error" className="mt-1 text-xs text-[hsl(var(--color-error))]">
                      {errors.year}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="vf-fuel" className="mb-1.5 block text-xs font-bold text-[hsl(var(--color-content))]">
                    Fuel type <span className="text-[hsl(var(--color-error))]">*</span>
                  </label>
                  <select
                    id="vf-fuel"
                    value={form.fuel}
                    onChange={(event) => update("fuel", event.target.value)}
                    aria-invalid={Boolean(errors.fuel) || undefined}
                    aria-describedby={errors.fuel ? "vf-fuel-error" : undefined}
                    className={fieldCls}
                  >
                    <option value="" disabled>
                      Select fuel
                    </option>
                    {FUEL_TYPES.map((fuel) => (
                      <option key={fuel} value={fuel}>
                        {fuel}
                      </option>
                    ))}
                  </select>
                  {errors.fuel && (
                    <p id="vf-fuel-error" className="mt-1 text-xs text-[hsl(var(--color-error))]">
                      {errors.fuel}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="vf-transmission" className="mb-1.5 block text-xs font-bold text-[hsl(var(--color-content))]">
                    Transmission <span className="text-[hsl(var(--color-error))]">*</span>
                  </label>
                  <select
                    id="vf-transmission"
                    value={form.transmission}
                    onChange={(event) => update("transmission", event.target.value)}
                    aria-invalid={Boolean(errors.transmission) || undefined}
                    aria-describedby={errors.transmission ? "vf-transmission-error" : undefined}
                    className={fieldCls}
                  >
                    <option value="" disabled>
                      Select transmission
                    </option>
                    {TRANSMISSION_TYPES.map((transmission) => (
                      <option key={transmission} value={transmission}>
                        {transmission}
                      </option>
                    ))}
                  </select>
                  {errors.transmission && (
                    <p id="vf-transmission-error" className="mt-1 text-xs text-[hsl(var(--color-error))]">
                      {errors.transmission}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="vf-mileage" className="mb-1.5 block text-xs font-bold text-[hsl(var(--color-content))]">
                    Kilometres driven <span className="text-[hsl(var(--color-error))]">*</span>
                  </label>
                  <input
                    id="vf-mileage"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={form.mileage}
                    onChange={(event) => update("mileage", event.target.value)}
                    aria-invalid={Boolean(errors.mileage) || undefined}
                    aria-describedby={errors.mileage ? "vf-mileage-error" : undefined}
                    placeholder="e.g. 32000"
                    className={fieldCls}
                  />
                  {errors.mileage && (
                    <p id="vf-mileage-error" className="mt-1 text-xs text-[hsl(var(--color-error))]">
                      {errors.mileage}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="vf-ownership" className="mb-1.5 block text-xs font-bold text-[hsl(var(--color-content))]">
                    Ownership <span className="text-[hsl(var(--color-error))]">*</span>
                  </label>
                  <select
                    id="vf-ownership"
                    value={form.ownership}
                    onChange={(event) => update("ownership", event.target.value)}
                    aria-invalid={Boolean(errors.ownership) || undefined}
                    aria-describedby={errors.ownership ? "vf-ownership-error" : undefined}
                    className={fieldCls}
                  >
                    <option value="" disabled>
                      Select ownership
                    </option>
                    {OWNERSHIP_OPTIONS.map((ownership) => (
                      <option key={ownership} value={ownership}>
                        {ownership}
                      </option>
                    ))}
                  </select>
                  {errors.ownership && (
                    <p id="vf-ownership-error" className="mt-1 text-xs text-[hsl(var(--color-error))]">
                      {errors.ownership}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="vf-state" className="mb-1.5 block text-xs font-bold text-[hsl(var(--color-content))]">
                    Registration state <span className="text-[hsl(var(--color-error))]">*</span>
                  </label>
                  <select
                    id="vf-state"
                    value={form.state}
                    onChange={(event) => update("state", event.target.value)}
                    aria-invalid={Boolean(errors.state) || undefined}
                    aria-describedby={errors.state ? "vf-state-error" : undefined}
                    className={fieldCls}
                  >
                    <option value="" disabled>
                      Select state
                    </option>
                    {INDIAN_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                  {errors.state && (
                    <p id="vf-state-error" className="mt-1 text-xs text-[hsl(var(--color-error))]">
                      {errors.state}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="vf-city" className="mb-1.5 block text-xs font-bold text-[hsl(var(--color-content))]">
                    City <span className="text-[hsl(var(--color-error))]">*</span>
                  </label>
                  <input
                    id="vf-city"
                    value={form.city}
                    onChange={(event) => update("city", event.target.value)}
                    maxLength={80}
                    aria-invalid={Boolean(errors.city) || undefined}
                    aria-describedby={errors.city ? "vf-city-error" : undefined}
                    placeholder="e.g. Pune"
                    className={fieldCls}
                  />
                  {errors.city && (
                    <p id="vf-city-error" className="mt-1 text-xs text-[hsl(var(--color-error))]">
                      {errors.city}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="vf-condition" className="mb-1.5 block text-xs font-bold text-[hsl(var(--color-content))]">
                    Overall condition <span className="text-[hsl(var(--color-error))]">*</span>
                  </label>
                  <select
                    id="vf-condition"
                    value={form.condition}
                    onChange={(event) => update("condition", event.target.value)}
                    aria-invalid={Boolean(errors.condition) || undefined}
                    aria-describedby={errors.condition ? "vf-condition-error" : undefined}
                    className={fieldCls}
                  >
                    <option value="" disabled>
                      Select condition
                    </option>
                    {CONDITION_OPTIONS.map((condition) => (
                      <option key={condition} value={condition}>
                        {condition}
                      </option>
                    ))}
                  </select>
                  {errors.condition && (
                    <p id="vf-condition-error" className="mt-1 text-xs text-[hsl(var(--color-error))]">
                      {errors.condition}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="vf-price" className="mb-1.5 block text-xs font-bold text-[hsl(var(--color-content))]">
                    Expected price (₹) <span className="font-normal text-[hsl(var(--color-content-muted))]">(optional)</span>
                  </label>
                  <input
                    id="vf-price"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={form.expectedPrice}
                    onChange={(event) => update("expectedPrice", event.target.value)}
                    aria-invalid={Boolean(errors.expectedPrice) || undefined}
                    aria-describedby={errors.expectedPrice ? "vf-price-error" : undefined}
                    placeholder="What you'd like to get"
                    className={fieldCls}
                  />
                  {errors.expectedPrice && (
                    <p id="vf-price-error" className="mt-1 text-xs text-[hsl(var(--color-error))]">
                      {errors.expectedPrice}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="vf-registration" className="mb-1.5 block text-xs font-bold text-[hsl(var(--color-content))]">
                    Registration number <span className="font-normal text-[hsl(var(--color-content-muted))]">(optional)</span>
                  </label>
                  <input
                    id="vf-registration"
                    value={form.registration}
                    onChange={(event) => update("registration", event.target.value.toUpperCase())}
                    maxLength={20}
                    placeholder="e.g. DL01AB1234"
                    className={fieldCls}
                  />
                </div>
              </div>

              <p className="rounded-lg border border-dashed border-[hsl(var(--color-line-hover))] bg-[hsl(var(--color-surface))] px-3 py-2.5 text-xs leading-5 text-[hsl(var(--color-content-muted))]">
                Photographs help us quote faster. Anonymous uploads are not supported, so our team
                will request photos during the callback if needed.
              </p>
            </>
          )}

          {step === 3 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="vf-name" className="mb-1.5 block text-xs font-bold text-[hsl(var(--color-content))]">
                    Your name <span className="text-[hsl(var(--color-error))]">*</span>
                  </label>
                  <input
                    id="vf-name"
                    autoComplete="name"
                    value={form.ownerName}
                    onChange={(event) => update("ownerName", event.target.value)}
                    maxLength={120}
                    aria-invalid={Boolean(errors.ownerName) || undefined}
                    aria-describedby={errors.ownerName ? "vf-name-error" : undefined}
                    placeholder="Full name"
                    className={fieldCls}
                  />
                  {errors.ownerName && (
                    <p id="vf-name-error" className="mt-1 text-xs text-[hsl(var(--color-error))]">
                      {errors.ownerName}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="vf-phone" className="mb-1.5 block text-xs font-bold text-[hsl(var(--color-content))]">
                    Phone number <span className="text-[hsl(var(--color-error))]">*</span>
                  </label>
                  <input
                    id="vf-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={13}
                    value={form.phone}
                    onChange={(event) => update("phone", event.target.value)}
                    aria-invalid={Boolean(errors.phone) || undefined}
                    aria-describedby={errors.phone ? "vf-phone-error" : undefined}
                    placeholder="10-digit mobile number"
                    className={fieldCls}
                  />
                  {errors.phone && (
                    <p id="vf-phone-error" className="mt-1 text-xs text-[hsl(var(--color-error))]">
                      {errors.phone}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="vf-email" className="mb-1.5 block text-xs font-bold text-[hsl(var(--color-content))]">
                  Email <span className="font-normal text-[hsl(var(--color-content-muted))]">(optional)</span>
                </label>
                <input
                  id="vf-email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) => update("email", event.target.value)}
                  maxLength={160}
                  aria-invalid={Boolean(errors.email) || undefined}
                  aria-describedby={errors.email ? "vf-email-error" : undefined}
                  placeholder="you@example.com"
                  className={fieldCls}
                />
                {errors.email && (
                  <p id="vf-email-error" className="mt-1 text-xs text-[hsl(var(--color-error))]">
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-start gap-2.5 text-xs leading-5 text-[hsl(var(--color-content-muted))]">
                  <input
                    type="checkbox"
                    checked={form.consent}
                    onChange={(event) => update("consent", event.target.checked)}
                    aria-invalid={Boolean(errors.consent) || undefined}
                    aria-describedby={errors.consent ? "vf-consent-error" : "vf-consent-note"}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-[hsl(var(--color-line))] accent-[hsl(var(--color-primary))]"
                  />
                  <span>
                    I agree to be contacted about this valuation and accept the{" "}
                    <Link
                      href="/privacy-policy"
                      className="font-semibold text-[hsl(var(--color-primary-strong))] underline underline-offset-2"
                    >
                      privacy policy
                    </Link>
                    .
                  </span>
                </label>
                <p id="vf-consent-note" className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[hsl(var(--color-content-muted))]">
                  <ShieldCheck size={13} className="text-[hsl(var(--color-primary-strong))]" aria-hidden="true" />
                  Your details are used only to respond to this request.
                </p>
                {errors.consent && (
                  <p id="vf-consent-error" className="mt-1 text-xs text-[hsl(var(--color-error))]">
                    {errors.consent}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => goToStep(step === 3 ? 2 : 1)}
            className={`inline-flex items-center gap-1.5 rounded-xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-surface))] px-4 py-2.5 text-sm font-semibold text-[hsl(var(--color-content))] transition hover:bg-[hsl(var(--color-surface-strong))] ${
              step === 1 ? "invisible" : ""
            }`}
          >
            <ChevronLeft size={16} aria-hidden="true" />
            Back
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[hsl(var(--color-primary))] px-6 py-2.5 text-sm font-bold text-[hsl(var(--color-primary-foreground))] transition hover:brightness-110 active:scale-[0.98]"
            >
              Continue
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--color-primary))] px-6 py-2.5 text-sm font-bold text-[hsl(var(--color-primary-foreground))] transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  Submitting…
                </>
              ) : (
                "Request valuation"
              )}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
