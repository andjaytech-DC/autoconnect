import { ChevronRight, Search } from "lucide-react";

export function HeroSearchBar() {
  return (
    <section className="py-6 lg:py-8 -mt-10 lg:-mt-12 relative z-20" aria-label="Quick search">
      <div className="container">
        <div className="mx-auto max-w-3xl">
          <form
            action="/cars"
            className="relative rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_40px_rgba(0,0,0,0.12)] sm:p-3"
            aria-label="Vehicle search"
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex flex-1 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 transition-colors">
                <label htmlFor="hero-make" className="sr-only">Make or Model</label>
                <Search size={16} className="shrink-0 text-slate-400 mr-2" aria-hidden="true" />
                <input
                  id="hero-make"
                  name="q"
                  type="text"
                  placeholder="Make or Model"
                  className="min-h-11 w-full bg-transparent px-3 py-2 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-500"
                  autoComplete="off"
                  enterKeyHint="search"
                />
              </div>
              <div className="relative flex shrink-0 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 transition-colors">
                <label htmlFor="hero-budget" className="sr-only">Budget</label>
                <ChevronRight size={16} className="mr-2 shrink-0 rotate-90 text-slate-400" aria-hidden="true" />
                <select
                  id="hero-budget"
                  name="budget"
                  className="min-h-11 w-full appearance-none bg-transparent py-2 text-sm font-medium text-slate-900 outline-none"
                >
                  <option value="">Any Budget</option>
                  <option value="0-5">Under ₹5 Lakh</option>
                  <option value="0-10">Under ₹10 Lakh</option>
                  <option value="0-15">Under ₹15 Lakh</option>
                  <option value="0-25">Under ₹25 Lakh</option>
                  <option value="25-">₹25 Lakh+</option>
                  <option value="50-100">₹50 Lakh – ₹1 Crore</option>
                  <option value="100-">₹1 Crore+</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary min-h-11 shrink-0 gap-2 px-4 py-2 text-sm font-bold">
                <Search size={14} aria-hidden="true" />
                Search
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}