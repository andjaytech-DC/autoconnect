import { ChevronRight, Search } from "lucide-react";

export function HeroSearchBar() {
  return (
    <section className="py-6 lg:py-8" aria-label="Quick search">
      <div className="container">
        <div className="mx-auto max-w-3xl">
          <form
            action="/cars"
            className="relative rounded-2xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-card))] p-2 shadow-[var(--shadow-elevated)] sm:p-3"
            aria-label="Vehicle search"
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex flex-1 items-center rounded-xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-bg))] px-4 focus-within:border-[hsl(var(--color-primary))] focus-within:ring-2 focus-within:ring-[hsl(var(--color-focus)/0.2)] transition-colors">
                <label htmlFor="hero-make" className="sr-only">Make or Model</label>
                <Search size={16} className="shrink-0 text-[hsl(var(--color-content-faint))] mr-2" aria-hidden="true" />
                <input
                  id="hero-make"
                  name="q"
                  type="text"
                  placeholder="Make or Model"
                  className="w-full bg-transparent px-3 py-2 text-sm font-medium text-[hsl(var(--color-content))] outline-none placeholder:text-[hsl(var(--color-content-faint))]"
                  aria-label="Search by brand or model"
                />
              </div>
              <div className="relative flex shrink-0 items-center rounded-xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-bg))] px-4 focus-within:border-[hsl(var(--color-primary))] focus-within:ring-2 focus-within:ring-[hsl(var(--color-focus)/0.2)] transition-colors">
                <label htmlFor="hero-budget" className="sr-only">Budget</label>
                <ChevronRight size={16} className="mr-2 shrink-0 rotate-90 text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
                <select
                  id="hero-budget"
                  name="budget"
                  className="w-full appearance-none bg-transparent py-2 text-sm font-medium text-[hsl(var(--color-content))] outline-none"
                >
                  <option value="">Any Budget</option>
                  <option value="0-5">Under ₹5 Lakh</option>
                  <option value="0-10">Under ₹10 Lakh</option>
                  <option value="0-15">Under ₹15 Lakh</option>
                  <option value="0-25">Under ₹25 Lakh</option>
                  <option value="25-">₹25 Lakh+</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary shrink-0 gap-2 px-4 py-2 text-sm font-bold">
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