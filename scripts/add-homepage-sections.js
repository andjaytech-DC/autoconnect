const fs = require('fs');
let content = fs.readFileSync('app/page.tsx', 'utf8');

// Add the EXCLUSIVE ARRIVALS and COMING SOON sections after the Hero section
const heroEndMarker = '      </section>';
const firstSectionEnd = content.indexOf('      </section>');
const secondSectionEnd = content.indexOf('      </section>', firstSectionEnd + 14);
const heroEndIndex = secondSectionEnd + 14;

const newSections = `
      {/* ═══════════════════════════════════════════
          EXCLUSIVE ARRIVALS
      ═══════════════════════════════════════════ */}
      <section className="container pb-16" aria-label="Exclusive arrivals">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#FFC700]">Exclusive Arrivals</span>
            <h2 className="mt-2 text-2xl font-extrabold text-white lg:text-3xl">Featured Exclusive Arrivals</h2>
          </div>
          <Link href="/cars?featured=exclusive" className="hidden items-center gap-1 text-sm font-semibold text-[#FFC700] transition hover:gap-2 lg:inline-flex">
            View All <ArrowRight size={16} />
          </Link>
        </div>
        {featuredCars.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredCars.slice(0, 3).map((car) => (
              <article key={car.id} className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101318] transition-all duration-300 hover:-translate-y-1 hover:border-white/15 hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#080a0d]">
                  {car.image ? (
                    <Image src={car.image} alt={car.name} fill sizes="(max-width:768px)100vw,33vw" className="object-contain p-4 transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center"><Car className="text-slate-600" size={48} /></div>
                  )}
                  <span className="absolute left-3 top-3 rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase text-white">
                    Exclusive
                  </span>
                </div>
                <div className="flex flex-1 flex-col px-4 pt-4 pb-4">
                  <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">{car.brand}</p>
                  <h3 className="mt-1 text-base font-bold text-white line-clamp-1">{car.name}</h3>
                  <div className="mt-2 flex items-center gap-1 text-xs text-slate-400"><Fuel size={12} /> {car.fuel} · <Gauge size={12} /> {car.transmission}</div>
                  <div className="mt-auto pt-4 flex items-center justify-between border-t border-white/[0.06]">
                    <span className="text-lg font-extrabold text-emerald-400">
                      ₹{(car.price / 100000).toFixed(1)} Lakh
                      <span className="text-xs font-normal text-slate-500 ml-1">ex-showroom</span>
                    </span>
                    <span className="rounded-lg bg-emerald-600/10 p-2 text-emerald-400 transition group-hover:bg-emerald-600 group-hover:text-[#050608]">
                      <ChevronRight size={16} />
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.08] bg-[#101318] p-12 text-center">
            <Car className="mx-auto text-slate-500" size={48} />
            <p className="mt-4 text-slate-500">Exclusive arrivals coming soon.</p>
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════
          COMING SOON
      ═══════════════════════════════════════════ */}
      <section className="container pb-16" aria-label="Coming soon">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#FFC700]">Coming Soon</span>
            <h2 className="mt-2 text-2xl font-extrabold text-white lg:text-3xl">Upcoming Exclusive Arrivals</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <article className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101318] transition-all duration-300 hover:-translate-y-1 hover:border-white/15 hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#080a0d]">
              <div className="h-full w-full flex items-center justify-center"><Car className="text-slate-600" size={48} /></div>
              <span className="absolute left-3 top-3 rounded-lg bg-amber-600 px-2.5 py-1 text-[10px] font-bold uppercase text-white">
                Coming Soon
              </span>
            </div>
            <div className="flex flex-1 flex-col px-4 pt-4 pb-4">
              <p className="text-xs font-medium text-amber-400 uppercase tracking-wider">Mercedes-Benz</p>
              <h3 className="mt-1 text-base font-bold text-white line-clamp-1">GLA 200</h3>
              <div className="mt-2 flex items-center gap-1 text-xs text-slate-400"><Fuel size={12} /> Petrol · <Gauge size={12} /> Automatic</div>
              <div className="mt-auto pt-4 flex items-center justify-between border-t border-white/[0.06]">
                <span className="text-lg font-extrabold text-amber-400">
                  Price on request
                  <span className="text-xs font-normal text-slate-500 ml-1">ex-showroom</span>
                </span>
                <span className="rounded-lg bg-amber-600/10 p-2 text-amber-400 transition group-hover:bg-amber-600 group-hover:text-[#050608]">
                  <ChevronRight size={16} />
                </span>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          TRUST & PLATFORM STATS
      ═══════════════════════════════════════════ */}
      <section className="container pb-16" aria-label="Platform statistics">
        <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-16">
          {stats.map((stat, index) => (
            <div key={stat.label} className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-3xl font-extrabold text-white tracking-tight lg:text-4xl">{stat.value}</div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.label}</div>
              </div>
              {index < stats.length - 1 && (
                <div className="hidden h-12 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent lg:block" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      </section>
`;

if (heroEndIndex > 0) {
  content = content.slice(0, heroEndIndex) + newSections + content.slice(heroEndIndex);
  fs.writeFileSync('app/page.tsx', content);
  console.log('Done');
} else {
  console.log('Hero end marker not found');
}