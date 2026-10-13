const fs = require('fs');
const content = fs.readFileSync('app/cars/page.tsx', 'utf8');

// Replace the hero section
const oldHero = `      {/* ========================================================= */}
      {/* HERO                                                      */}
      {/* ========================================================= */}
      <section className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white">
        <div className="relative max-w-7xl mx-auto px-6 lg:px-12 py-20 lg:py-28">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <span className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-[0.18em] px-4 py-2 rounded-full mb-6 animate-fade-in-up">
              <Sparkles size={14} />
              Full Showroom
            </span>

            {/* Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-3xl mx-auto leading-tight animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              Browse every{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFC700] via-yellow-300 to-[#3b82f6]">
                certified car
              </span>
            </h1>

            <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              Certified pre-owned vehicles with transparent pricing and a
              200-point inspection report.
            </p>

            {/* Body type filter chips */}
            <div className="mt-10 flex flex-wrap justify-center gap-3 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
              {bodyTypes.map((type) => (
                <button
                  key={type.label}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-300 transition-all duration-200 hover:border-emerald-400/50 hover:bg-emerald-500/10 hover:text-emerald-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/10"
                >
                  <span className="text-base">{type.icon}</span>
                  {type.label}
                </button>
              ))}
            </div>

            {/* Stats row */}
            <div className="mt-10 flex justify-center gap-8 text-center animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
              {[
                { value: "500+", label: "Cars Listed" },
                { value: "50+", label: "Brands" },
                { value: "200pt", label: "Inspection" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl font-extrabold text-white">{stat.value}</p>
                  <p className="text-xs text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section`;

const newHero = `  {/* ========================================================= */}
      {/* HERO - COMPACT                                             */}
      {/* ========================================================= */}
      <section className="bg-[var(--color-bg-dark)] text-white py-12 lg:py-16">
        <div className="relative max-w-7xl mx-auto px-6 lg:px-12">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <span className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-[0.18em] px-4 py-2 rounded-full mb-4">
              <Sparkles size={14} />
              Full Showroom
            </span>

            {/* Heading */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight max-w-3xl mx-auto leading-tight">
              Browse every{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFC700] via-yellow-300 to-[#3b82f6]">
                certified car
              </span>
            </h1>

            <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
              Certified pre-owned vehicles with transparent pricing and a
              200-point inspection report.
            </p>

            {/* Body type filter chips */}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {bodyTypes.map((type) => (
                <button
                  key={type.label}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 transition-all duration-200 hover:border-emerald-400/50 hover:bg-emerald-500/10 hover:text-emerald-300 hover:-translate-y-0.5"
                >
                  <span className="text-sm">{type.icon}</span>
                  {type.label}
                </button>
              ))}
            </div>

            {/* Stats row */}
            <div className="mt-8 flex justify-center gap-6 text-center">
              {[
                { value: "500+", label: "Cars Listed" },
                { value: "50+", label: "Brands" },
                { value: "200pt", label: "Inspection" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-xl font-extrabold text-white">{stat.value}</p>
                  <p className="text-xs text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section`;

if (content.includes(oldHero)) {
  content = content.replace(oldHero, newHero);
  fs.writeFileSync('app/cars/page.tsx', content);
  console.log('Done!');
} else {
  console.log('Old hero not found');
}