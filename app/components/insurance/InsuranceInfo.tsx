'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Info, MapPin } from 'lucide-react';

import {
  COVER_TYPES,
  COVER_TYPE_HINT,
  COVER_TYPE_LABEL,
  type InsurancePartnerPublic,
} from '@/app/lib/insurance';

const TERMS: { term: string; meaning: string }[] = [
  { term: 'IDV (Insured Declared Value)', meaning: 'The most an insurer will pay if your car is stolen or damaged beyond repair. It is based on the car’s market value after depreciation.' },
  { term: 'Own damage', meaning: 'The part of a comprehensive policy that pays for damage to your own car (accident, fire, flood, theft and similar).' },
  { term: 'Third-party liability', meaning: 'Cover for injury to other people or damage to their property caused by your car. It is required by law for every car on the road.' },
  { term: 'No-claim bonus (NCB)', meaning: 'A discount on the own-damage part of your premium for each claim-free year. It belongs to you, not the car or the insurer.' },
  { term: 'Depreciation', meaning: 'The fall in value of parts as they age. Without a zero-depreciation add-on, insurers deduct it from the claim for many parts.' },
  { term: 'Add-on (rider)', meaning: 'Optional extra protection bought with a comprehensive policy, such as zero depreciation, engine protection or roadside assistance.' },
  { term: 'Deductible / excess', meaning: 'The portion of a claim you pay yourself before the insurer pays the rest.' },
];

const EXCLUSIONS = [
  'Normal wear and tear, ageing and mechanical or electrical breakdown (unless an add-on covers it).',
  'Damage while driving under the influence of alcohol or drugs.',
  'Driving without a valid licence, or by someone not permitted to drive under the policy.',
  'Using the car for a purpose the policy does not allow (for example hire or racing when insured as private).',
  'Consequential loss, such as the cost of hiring another car while yours is repaired (unless an add-on covers it).',
  'Damage outside the geographical area the policy covers, and losses caused by war or nuclear risks.',
];

const label = (code: string) => COVER_TYPE_LABEL[code] ?? code;

export default function InsuranceInfo() {
  const [partners, setPartners] = useState<InsurancePartnerPublic[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    fetch('/api/insurance/partners')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((d) => live && setPartners(d.partners ?? []))
      .catch(() => live && (setPartners([]), setFailed(true)));
    return () => {
      live = false;
    };
  }, []);

  return (
    <section id="insurance-info" aria-labelledby="insurance-info-heading" className="mx-auto mt-16 max-w-5xl scroll-mt-28 space-y-14">
      <div>
        <span className="eyebrow">Good to know</span>
        <h2 id="insurance-info-heading" className="mt-3 text-3xl font-bold">How insurance enquiries work</h2>
        <div className="gold-rule mt-4 max-w-[10rem]" aria-hidden="true" />
        <p className="mt-4 max-w-3xl text-sm leading-6 text-[hsl(var(--color-content-muted))]">
          <strong>Progressive AutoHub is not an insurer.</strong>{' '}
          You send us an enquiry, we refer it to an insurance
          partner, and the partner quotes and issues any policy outside this website. We can&apos;t promise a response
          time, a price or that a policy will be offered.
        </p>
      </div>

      {/* Types of cover */}
      <div>
        <h3 className="text-xl font-bold">Types of cover you can ask about</h3>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          {COVER_TYPES.map((c) => (
            <div key={c} className="rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] p-5">
              <dt className="text-base font-bold">{COVER_TYPE_LABEL[c]}</dt>
              <dd className="mt-1 text-sm leading-6 text-[hsl(var(--color-content-muted))]">{COVER_TYPE_HINT[c]}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Terms */}
      <div>
        <h3 className="text-xl font-bold">Terms in plain words</h3>
        <dl className="mt-5 divide-y divide-[hsl(var(--color-line))] rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))]">
          {TERMS.map((t) => (
            <div key={t.term} className="grid gap-1 p-4 sm:grid-cols-[14rem_1fr] sm:gap-4 sm:px-5">
              <dt className="text-sm font-bold">{t.term}</dt>
              <dd className="text-sm leading-6 text-[hsl(var(--color-content-muted))]">{t.meaning}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Exclusions */}
      <div>
        <h3 className="text-xl font-bold">What policies commonly don&apos;t cover</h3>
        <ul className="mt-5 list-disc space-y-2 pl-5 text-sm leading-6 text-[hsl(var(--color-content-muted))]">
          {EXCLUSIONS.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
        <p className="mt-4 flex gap-2 rounded-xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-surface-strong))] p-4 text-xs leading-5 text-[hsl(var(--color-content-muted))]">
          <Info size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            This is general information, not advice, and exclusions differ between policies. Always read the policy
            wording and its exclusions before you buy. Insurance is the subject matter of solicitation.
          </span>
        </p>
      </div>

      {/* Partners */}
      <div>
        <h3 className="text-xl font-bold">Our insurance partners</h3>
        {partners === null ? (
          <p role="status" className="mt-4 text-sm text-[hsl(var(--color-content-muted))]">Loading…</p>
        ) : failed ? (
          <p role="alert" className="mt-4 text-sm text-[hsl(var(--color-content-muted))]">
            We couldn&apos;t load the partner list just now.
          </p>
        ) : partners.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] p-6 text-sm leading-6 text-[hsl(var(--color-content-muted))]">
            No insurance partners are active on the platform right now. You can still send an enquiry and our team will
            review it, but we can&apos;t say when a partner will be able to respond.
          </p>
        ) : (
          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {partners.map((p) => (
              <li key={p.id} className="rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] p-5">
                <h4 className="text-base font-bold">{p.name}</h4>
                {p.licenceNote && (
                  <p className="mt-1 text-xs leading-5 text-[hsl(var(--color-content-muted))]">{p.licenceNote}</p>
                )}
                {p.description && <p className="mt-2 text-sm leading-6 text-[hsl(var(--color-content-muted))]">{p.description}</p>}
                <p className="mt-3 text-xs font-semibold text-[hsl(var(--color-content))]">Handles: {p.products.map(label).join(' · ')}</p>
                {p.cities.length > 0 && (
                  <p className="mt-1 flex items-start gap-1.5 text-xs text-[hsl(var(--color-content-muted))]">
                    <MapPin size={12} className="mt-0.5 shrink-0" aria-hidden="true" /> {p.cities.join(', ')}
                  </p>
                )}
                {p.website && (
                  <a href={p.website} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-[hsl(var(--color-primary-strong))] hover:underline">
                    Visit website <ExternalLink size={12} aria-hidden="true" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs leading-5 text-[hsl(var(--color-content-muted))]">
          A partner&apos;s phone and email are shared with you once your enquiry is assigned to them, in{' '}
          <Link href="/insurance/my-enquiries" className="font-semibold text-[hsl(var(--color-primary-strong))] underline">your account</Link>.
        </p>
      </div>
    </section>
  );
}
