"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  ChevronDown,
  Headphones,
  Heart,
  Menu,
  Search,
  ShieldCheck,
  X,
  User,
  MapPin,
} from "lucide-react";
import {
  primaryNav,
  type NavChild,
  type NavItem,
} from "@/app/data/navigation";
import { isActivePath, isNavItemActive } from "@/app/lib/navigation";
import NotificationBell from "@/app/components/NotificationBell";

const slugify = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function linksOf(item: NavItem): NavChild[] {
  if (item.megaSections?.length) {
    return item.megaSections.flatMap((section) => section.items);
  }
  return item.children ?? [];
}

export default function Navbar() {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const headerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const closeMenus = useCallback(() => setOpenMenu(null), []);
  // A mouse press focuses the button *before* its click fires. Without this flag,
  // onFocus opened the menu and the click then toggled it shut, so the dropdowns
  // could not be opened with a mouse in Chrome/Edge. Keyboard focus still opens it.
  const pointerFocusRef = useRef(false);

  const closeDrawer = useCallback(() => {
    setMobileOpen(false);
    setMobileSection(null);
    triggerRef.current?.focus();
  }, []);

  const closeEverything = useCallback(() => {
    closeMenus();
    setMobileOpen(false);
    setMobileSection(null);
  }, [closeMenus]);

  useEffect(() => {
    if (!openMenu) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) closeMenus();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openMenu, closeMenus]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDrawer();
        return;
      }
      if (event.key !== "Tab") return;

      const drawer = drawerRef.current;
      if (!drawer) return;
      const focusables = drawer.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const current = document.activeElement;
      if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen, closeDrawer]);

  useEffect(() => {
    if (mobileOpen) drawerRef.current?.focus();
  }, [mobileOpen]);

  const desktopItems = primaryNav.filter((item) => item.href !== "/");
  const openMegaItem = desktopItems.find(
    (item) => item.megaSections?.length && openMenu === item.label,
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/cars?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <>
      {/* Top Utility Bar */}
      <div className="hidden border-b border-[hsl(var(--color-primary)/0.45)] bg-ink-900 lg:block">
        <div className="mx-auto flex h-9 max-w-[1500px] items-center justify-between px-6 text-xs xl:px-8">
          <div className="flex items-center gap-5">
            <span className="inline-flex items-center gap-1.5 text-[#C9CEDF]">
              <ShieldCheck
                size={14}
                className="text-[#D8B762]"
                aria-hidden="true"
              />
              Premium pre-owned cars
            </span>
            <span className="h-3.5 w-px bg-white/20" aria-hidden="true" />
            <span className="inline-flex items-center gap-1.5 text-[#C9CEDF]">
              <Headphones size={13} className="text-[#D8B762]" aria-hidden="true" />
              Call or WhatsApp support
            </span>
          </div>

          <div className="flex items-center gap-4 text-[#C9CEDF]">
            <Link
              href="/cars"
              className="inline-flex min-h-6 items-center gap-1 transition hover:text-[#ECD48C]"
            >
              <Search size={13} aria-hidden="true" />
              Search Cars
            </Link>
            <span className="text-white/30" aria-hidden="true">
              |
            </span>
            <Link
              href="/orders"
              className="inline-flex min-h-6 items-center transition hover:text-[#ECD48C]"
            >
              Track Order
            </Link>
            <Link
              href="/about#contact"
              className="inline-flex min-h-6 items-center transition hover:text-[#ECD48C]"
            >
              Help
            </Link>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-50 border-b border-[hsl(var(--color-line))] bg-[hsl(var(--color-bg))]/92 shadow-[0_1px_0_0_hsl(var(--color-primary)/0.4)] backdrop-blur-2xl glass-nav">
        <div
          ref={headerRef}
          className="relative mx-auto max-w-[1500px] px-4 sm:px-6 xl:px-8"
          onMouseLeave={() => setOpenMenu(null)}
        >
          {/* Row 1 — brand · search · account actions */}
          <div className="flex min-h-[60px] items-center gap-4">
            {/* Logo */}
            <Link
              href="/"
              aria-label="Progressive AutoHub — home"
              className="group flex shrink-0 items-center gap-2.5"
            >
              <span
                aria-hidden="true"
                className="font-display flex h-11 w-11 items-center justify-center rounded-full bg-ink-900 text-xl font-bold ring-1 ring-[hsl(var(--color-primary))] ring-offset-2 ring-offset-[hsl(var(--color-bg))] shadow-md shadow-[hsl(var(--color-primary)/0.3)] transition-transform group-hover:scale-105"
              >
                {/* Own element: background-clip:text would otherwise clip the navy disc away. */}
                <span className="text-gold-metal">P</span>
              </span>
              <span className="hidden leading-none sm:block">
                <span className="font-display block text-[1.05rem] font-bold uppercase tracking-[0.1em] text-[hsl(var(--color-content))]">
                  Progressive{" "}
                  <span className="text-[hsl(var(--color-primary-strong))]">AutoHub</span>
                </span>
                <span className="mt-1 block text-[0.65rem] font-medium uppercase tracking-[0.3em] text-[hsl(var(--color-content-muted))]">
                  Buy • Sell • Finance • Service
                </span>
              </span>
            </Link>

            <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
              {/* Search Bar (desktop) */}
              <form
                onSubmit={handleSearch}
                role="search"
                className={`hidden items-center gap-2 rounded-xl border transition-all duration-200 lg:flex ${
                  searchFocused
                    ? "w-64 border-[hsl(var(--color-primary)/0.5)] bg-[hsl(var(--color-surface))]"
                    : "w-48 border-[hsl(var(--color-line))] bg-[hsl(var(--color-surface-strong))] hover:border-[hsl(var(--color-line-hover))]"
                }`}
              >
                <Search
                  size={15}
                  className="ml-3 shrink-0 text-[hsl(var(--color-content-muted))]"
                  aria-hidden="true"
                />
                <label htmlFor="header-search" className="sr-only">
                  Search cars
                </label>
                <input
                  id="header-search"
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder="Search cars..."
                  className="w-full bg-transparent py-2 pr-3 text-base sm:text-sm text-[hsl(var(--color-content))] outline-none placeholder:text-[hsl(var(--color-content-muted))]"
                />
              </form>

              {/* City Selector */}
              <Link
                href="/dealers"
                className="hidden h-10 items-center gap-1.5 rounded-lg border border-[hsl(var(--color-line))] bg-[hsl(var(--color-surface-strong))] px-3 text-xs font-medium text-[hsl(var(--color-content-muted))] transition hover:border-[hsl(var(--color-line-hover))] hover:text-[hsl(var(--color-content))] lg:flex"
              >
                <MapPin size={13} className="text-[hsl(var(--color-primary-strong))]" aria-hidden="true" />
                <span>All Cities</span>
              </Link>

              {/* Wishlist */}
              <Link
                href="/wishlist"
                aria-label="Wishlist"
                className="hidden h-10 w-10 items-center justify-center rounded-lg border border-[hsl(var(--color-line))] bg-[hsl(var(--color-surface-strong))] text-[hsl(var(--color-content-muted))] transition hover:border-[hsl(var(--color-primary)/0.4)] hover:bg-[hsl(var(--color-primary)/0.12)] hover:text-[hsl(var(--color-primary-strong))] lg:flex"
              >
                <Heart size={17} aria-hidden="true" />
              </Link>

              {/* Notifications */}
              <NotificationBell />

              {/* Login */}
              <Link
                href="/login"
                className="hidden h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-[hsl(var(--color-content-muted))] transition hover:bg-[hsl(var(--color-line))] hover:text-[hsl(var(--color-content))] lg:flex"
              >
                <User size={15} aria-hidden="true" />
                Login
              </Link>

              {/* Register */}
              <Link
                href="/register"
                className="hidden h-11 items-center rounded-lg bg-gradient-to-r from-[hsl(var(--color-primary))] to-yellow-500 px-4 text-sm font-bold text-[hsl(var(--color-primary-foreground))] shadow-lg shadow-[hsl(var(--color-primary)/0.25)] transition hover:brightness-105 hover:shadow-[hsl(var(--color-primary)/0.35)] lg:flex"
              >
                Register
              </Link>

              {/* Hamburger */}
              <button
                ref={triggerRef}
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
                aria-expanded={mobileOpen}
                aria-controls="mobile-menu-drawer"
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-[hsl(var(--color-line))] bg-[hsl(var(--color-surface-strong))] text-[hsl(var(--color-content))] transition hover:bg-[hsl(var(--color-line))] xl:hidden"
              >
                <Menu size={20} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Row 2 — primary navigation (desktop).
              Split onto its own row so the 7-item nav and the search/account
              cluster can never collide (they previously overlapped between
              1280px and 1536px). */}
          <nav aria-label="Main" className="hidden xl:block">
            <ul className="flex items-center gap-0.5 overflow-x-auto border-t border-[hsl(var(--color-line))] py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {desktopItems.map((item) => {
                const slug = slugify(item.label);
                const panelId = `nav-panel-${slug}`;
                const links = linksOf(item);
                const isMega = Boolean(item.megaSections?.length);
                const isSimple = !isMega && links.length > 0;
                const isOpen = openMenu === item.label;
                const active = isNavItemActive(
                  pathname,
                  item.href,
                  item.match,
                  item.children,
                  item.megaSections,
                );

                const triggerClass = `inline-flex h-9 items-center whitespace-nowrap rounded-lg px-3 text-[13px] font-semibold transition-all duration-200 ${
                  isOpen || active
                    ? "bg-[hsl(var(--color-primary)/0.16)] text-[hsl(var(--color-primary-strong))]"
                    : "text-[hsl(var(--color-content-muted))] hover:bg-[hsl(var(--color-line))] hover:text-[hsl(var(--color-content))]"
                }`;

                if (!isMega && !isSimple) {
                  return (
                    <li key={item.label}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={triggerClass}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                }

                const trigger = (
                  <button
                    type="button"
                    onPointerDown={() => {
                      pointerFocusRef.current = true;
                    }}
                    onClick={() => {
                      pointerFocusRef.current = false;
                      setOpenMenu(isOpen ? null : item.label);
                    }}
                    onFocus={() => {
                      if (pointerFocusRef.current) {
                        pointerFocusRef.current = false;
                        return;
                      }
                      setOpenMenu(item.label);
                    }}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    aria-controls={panelId}
                    className={triggerClass}
                  >
                    {item.label}
                    <ChevronDown
                      size={14}
                      aria-hidden="true"
                      className={`ml-1 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                );

                if (isSimple) {
                  return (
                    <li key={item.label} className="relative">
                      {trigger}
                      {isOpen && (
                        <div
                          id={panelId}
                          className="absolute left-1/2 top-full z-50 w-64 max-w-[90vw] -translate-x-1/2 pt-2"
                        >
                          <ul className="overflow-hidden rounded-xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-surface))] p-1.5 shadow-[var(--shadow-elevated-hover)]">
                            {links.map((child) => (
                              <li key={`${child.label}-${child.href}`}>
                                <Link
                                  href={child.href}
                                  onClick={closeMenus}
                                  aria-current={
                                    isActivePath(pathname, child.href) ? "page" : undefined
                                  }
                                  className="flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-[hsl(var(--color-content-muted))] transition hover:bg-[hsl(var(--color-primary)/0.12)] hover:text-[hsl(var(--color-primary-strong))]"
                                >
                                  <span className="min-w-0">
                                    {child.label}
                                    {child.description && (
                                      <span className="mt-0.5 block text-xs font-normal text-[hsl(var(--color-content-muted))]">
                                        {child.description}
                                      </span>
                                    )}
                                  </span>
                                  <ArrowRight
                                    size={14}
                                    aria-hidden="true"
                                    className="shrink-0 text-[hsl(var(--color-line-hover))] transition group-hover:translate-x-0.5"
                                  />
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </li>
                  );
                }

                return (
                  <li key={item.label} className="relative">
                    {trigger}
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Mega Menu Panel */}
          {openMegaItem && (
            <div
              id={`nav-panel-${slugify(openMegaItem.label)}`}
              className="absolute inset-x-0 top-full z-50 px-4 pt-2 sm:px-6 xl:px-8"
            >
              <div className="mx-auto max-w-4xl rounded-xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-surface))] p-5 shadow-[var(--shadow-elevated-hover)]">
                <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
                  {openMegaItem.megaSections?.map((section) => (
                    <div key={section.title}>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[hsl(var(--color-content-muted))]">
                        {section.title}
                      </p>
                      <ul className="space-y-0.5">
                        {section.items.map((child) => (
                          <li key={`${child.label}-${child.href}`}>
                            <Link
                              href={child.href}
                              onClick={closeMenus}
                              aria-current={
                                isActivePath(pathname, child.href) ? "page" : undefined
                              }
                              className="block rounded-lg px-3 py-2 text-sm font-medium text-[hsl(var(--color-content-muted))] transition hover:bg-[hsl(var(--color-primary)/0.12)] hover:text-[hsl(var(--color-primary-strong))]"
                            >
                              {child.label}
                              {child.description && (
                                <span className="mt-0.5 block text-xs font-normal text-[hsl(var(--color-content-muted))]">
                                  {child.description}
                                </span>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] xl:hidden">
          <div
            className="absolute inset-0 bg-[hsl(240_5%_11%)]/50 backdrop-blur-sm"
            onClick={closeDrawer}
            aria-hidden="true"
          />

          <div
            ref={drawerRef}
            id="mobile-menu-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            tabIndex={-1}
            className="absolute right-0 top-0 flex h-full w-[85%] max-w-[400px] flex-col bg-[hsl(var(--color-surface))] shadow-[var(--shadow-elevated-hover)] outline-none"
          >
            {/* Drawer Header */}
            <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-[hsl(var(--color-line))] px-5">
              <Link href="/" onClick={closeEverything} className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(var(--color-primary))] to-yellow-600 text-sm font-extrabold text-[hsl(var(--color-primary-foreground))]"
                >
                  P
                </span>
                <span className="leading-none">
                  <span className="block text-sm font-bold text-[hsl(var(--color-content))]">
                    PROGRESSIVE{" "}
                    <span className="text-[hsl(var(--color-primary-strong))]">AUTOHUB</span>
                  </span>
                  <span className="mt-0.5 block text-[8px] uppercase tracking-wider text-[hsl(var(--color-content-muted))]">
                    Buy • Sell • Finance • Service
                  </span>
                </span>
              </Link>

              <button
                type="button"
                onClick={closeDrawer}
                aria-label="Close menu"
                className="flex h-11 w-11 items-center justify-center rounded-lg bg-[hsl(var(--color-surface-strong))] text-[hsl(var(--color-content))] transition hover:bg-[hsl(var(--color-line))]"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {/* Search in Mobile */}
            <div className="border-b border-[hsl(var(--color-line))] px-5 py-3">
              <form
                onSubmit={handleSearch}
                role="search"
                className="flex items-center gap-2 rounded-xl border border-[hsl(var(--color-line))] bg-[hsl(var(--color-surface-strong))] px-3 py-2.5"
              >
                <Search
                  size={16}
                  className="shrink-0 text-[hsl(var(--color-content-muted))]"
                  aria-hidden="true"
                />
                <label htmlFor="mobile-search" className="sr-only">
                  Search cars
                </label>
                <input
                  id="mobile-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search cars..."
                  className="w-full bg-transparent text-base sm:text-sm text-[hsl(var(--color-content))] outline-none placeholder:text-[hsl(var(--color-content-muted))]"
                />
              </form>
            </div>

            {/* Mobile Navigation */}
            <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-5 py-3">
              {primaryNav.map((item) => {
                const sectionId = `mobile-section-${slugify(item.label)}`;
                const links = linksOf(item);
                const expanded = mobileSection === item.label;
                const active = isNavItemActive(
                  pathname,
                  item.href,
                  item.match,
                  item.children,
                  item.megaSections,
                );

                if (links.length === 0) {
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={closeEverything}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-11 items-center border-b border-[hsl(var(--color-line))] text-[14px] font-semibold transition ${
                        active
                          ? "text-[hsl(var(--color-primary-strong))]"
                          : "text-[hsl(var(--color-content))] hover:text-[hsl(var(--color-primary-strong))]"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                }

                const sectionLinks: NavChild[] = links.some(
                  (child) => child.href === item.href,
                )
                  ? links
                  : [{ label: "Overview", href: item.href }, ...links];

                return (
                  <div key={item.label} className="border-b border-[hsl(var(--color-line))]">
                    <button
                      type="button"
                      onClick={() => setMobileSection(expanded ? null : item.label)}
                      aria-expanded={expanded}
                      aria-controls={sectionId}
                      className={`flex min-h-11 w-full items-center justify-between text-left text-[14px] font-semibold transition ${
                        active
                          ? "text-[hsl(var(--color-primary-strong))]"
                          : "text-[hsl(var(--color-content))] hover:text-[hsl(var(--color-primary-strong))]"
                      }`}
                    >
                      {item.label}
                      <ChevronDown
                        size={16}
                        aria-hidden="true"
                        className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                      />
                    </button>

                    {expanded && (
                      <ul
                        id={sectionId}
                        className="mb-2 space-y-0.5 rounded-lg border border-[hsl(var(--color-line))] bg-[hsl(var(--color-surface-strong))] p-1.5"
                      >
                        {sectionLinks.map((child) => (
                          <li key={`${child.label}-${child.href}`}>
                            <Link
                              href={child.href}
                              onClick={closeEverything}
                              aria-current={
                                isActivePath(pathname, child.href) ? "page" : undefined
                              }
                              className="flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm text-[hsl(var(--color-content))] transition hover:bg-[hsl(var(--color-primary)/0.12)] hover:text-[hsl(var(--color-primary-strong))]"
                            >
                              <span className="min-w-0">
                                {child.label}
                                {child.description && (
                                  <span className="mt-0.5 block text-xs font-normal text-[hsl(var(--color-content-muted))]">
                                    {child.description}
                                  </span>
                                )}
                              </span>
                              <ArrowRight
                                size={13}
                                aria-hidden="true"
                                className="shrink-0 text-[hsl(var(--color-line-hover))]"
                              />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Mobile Footer */}
            <div className="shrink-0 border-t border-[hsl(var(--color-line))] p-5">
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/login"
                  onClick={closeEverything}
                  className="flex h-11 items-center justify-center rounded-xl border border-[hsl(var(--color-line))] text-sm font-bold text-[hsl(var(--color-content))] transition hover:bg-[hsl(var(--color-line))]"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  onClick={closeEverything}
                  className="flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-[hsl(var(--color-primary))] to-yellow-500 text-sm font-bold text-[hsl(var(--color-primary-foreground))] shadow-lg shadow-[hsl(var(--color-primary)/0.25)] transition hover:brightness-105"
                >
                  Register
                </Link>
              </div>
              <div className="mt-3 flex items-center justify-between px-1 text-sm font-semibold text-[hsl(var(--color-content-muted))]">
                <Link
                  href="/wishlist"
                  onClick={closeEverything}
                  className="inline-flex min-h-11 items-center transition hover:text-[hsl(var(--color-primary-strong))]"
                >
                  Wishlist
                </Link>
                <Link
                  href="/orders"
                  onClick={closeEverything}
                  className="inline-flex min-h-11 items-center transition hover:text-[hsl(var(--color-primary-strong))]"
                >
                  Track Order
                </Link>
                <Link
                  href="/about#contact"
                  onClick={closeEverything}
                  className="inline-flex min-h-11 items-center transition hover:text-[hsl(var(--color-primary-strong))]"
                >
                  Help
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
