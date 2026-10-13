import Link from "next/link";

const groups = [
  {
    title: "Buy & Sell",
    links: [
      { label: "Home", href: "/" },
      { label: "All Cars", href: "/cars" },
      { label: "Search Cars", href: "/cars?q=" },
      { label: "Electric Cars", href: "/electric" },
      { label: "Sell Your Car", href: "/sell" },
      { label: "Dealer Network", href: "/dealers" },
    ],
  },
  {
    title: "Finance & Insurance",
    links: [
      { label: "Car Finance", href: "/finance" },
      { label: "Apply for a Loan", href: "/loans" },
      { label: "EMI Calculator", href: "/finance#emi-calculator" },
      { label: "Car Insurance", href: "/insurance" },
      { label: "Challan Check", href: "/challan" },
      { label: "Car Check", href: "/car-check" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Sitemap", href: "/sitemap" },
    ],
  },
  {
    title: "Popular Brands",
    links: [
      { label: "Toyota", href: "/brands/toyota" },
      { label: "Hyundai", href: "/brands/hyundai" },
      { label: "Honda", href: "/brands/honda" },
      { label: "Kia", href: "/brands/kia" },
      { label: "Tesla", href: "/brands/tesla" },
      { label: "BMW", href: "/brands/bmw" },
      { label: "Mercedes", href: "/brands/mercedes" },
      { label: "Audi", href: "/brands/audi" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Help Center", href: "/services" },
      { label: "Contact Us", href: "/about#contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Login", href: "/login" },
      { label: "Register", href: "/register" },
    ],
  },
];

export default function SitemapPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col font-sans text-[var(--color-text-primary)]">

      <section className="max-w-7xl mx-auto w-full px-6 lg:px-12 py-20" aria-label="Sitemap">
        <h1 className="text-4xl font-extrabold tracking-tight mb-12">Sitemap</h1>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
          {groups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="text-xs uppercase tracking-widest font-bold text-[#FFC700] mb-4">
                {group.title}
              </h2>
              <ul className="space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-content-muted hover:text-[#FFC700] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </section>

    </div>
  );
}
