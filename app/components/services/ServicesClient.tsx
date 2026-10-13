'use client';

import { useEffect, useState } from 'react';
import { Search, MapPin, Wrench } from 'lucide-react';
import Link from 'next/link';

interface Provider {
  id: number;
  name: string;
  phone: string | null;
  city: string;
  address: string | null;
  services: string[];
  // present when the caller is signed in
  contactAvailable?: boolean;
}

const SERVICES = ['SERVICE', 'DETAILING', 'WASHING', 'TYRES', 'BATTERY', 'AC', 'DENTING', 'ROADIDE'];

export default function ServicesClient() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [service, setService] = useState('');
  const [contactAvailable, setContactAvailable] = useState(false);

  useEffect(() => {
    const qs = new URLSearchParams();
    if (service) qs.set('service', service);
    // Anonymous callers get the directory without phone/email/address; those
    // are only released to a signed-in session by /api/services/providers.
    qs.set('limit', '50');
    fetch('/api/services/providers' + (qs.toString() ? `?${qs}` : ''))
      .then((r) => r.json())
      .then((d) => {
        setProviders(d.providers || []);
        setContactAvailable(Boolean(d.contactAvailable));
      })
      .catch(() => setProviders([]));
  }, [service]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setService('')} className={'px-3 py-1.5 rounded-lg text-xs font-bold ' + (!service ? 'bg-[#FFC700] text-[#15130a]' : 'bg-card text-content border border-line')}>All</button>
        {SERVICES.map((s) => (
          <button key={s} onClick={() => setService(s)} className={'px-3 py-1.5 rounded-lg text-xs font-bold ' + (service === s ? 'bg-[#FFC700] text-[#15130a]' : 'bg-card text-content border border-line')}>{s}</button>
        ))}
      </div>

      {providers.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl"><Wrench size={32} className="mx-auto text-content-muted mb-2" /><p className="text-sm text-content-muted">No providers found for this filter.</p></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((p) => (
            <div key={p.id} className="rounded-2xl border border-line bg-card p-5">
              <p className="font-bold text-content">{p.name}</p>
              <p className="text-xs text-content-muted mt-1 flex items-center gap-1"><MapPin size={12} /> {p.city}{p.address ? ` · ${p.address}` : ''}</p>
              {contactAvailable && p.phone ? (
                <p className="text-xs text-content-muted mt-1">{p.phone}</p>
              ) : (
                <Link
                  href="/login"
                  className="text-xs text-content-muted mt-1 inline-block underline hover:text-content"
                >
                  Sign in to view phone
                </Link>
              )}
              <div className="flex flex-wrap gap-1 mt-3">{p.services.map((s) => <span key={s} className="px-2 py-0.5 bg-surface rounded text-[10px] font-bold text-content">{s}</span>)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
