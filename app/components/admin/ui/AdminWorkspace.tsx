"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  CalendarCheck,
  Car,
  ChevronRight,
  Image as ImageIcon,
  Landmark,
  LayoutDashboard,
  MapPin,
  Menu,
  MessageSquare,
  Package,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  Wrench,
  X,
} from "lucide-react";

import {
  ADMIN_NAV_GROUPS,
  ADMIN_SECTION_BY_KEY,
  type AdminNavItem,
  type AdminSectionKey,
  type AdminSectionMeta,
} from "../adminSections";

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>> = {
  dashboard: LayoutDashboard,
  vehicles: Car,
  dealers: Store,
  customers: Users,
  listings: Package,
  "new-cars": Sparkles,
  leads: MessageSquare,
  "test-drives": CalendarCheck,
  inspections: Search,
  services: Wrench,
  insurance: Shield,
  security: ShieldCheck,
  trust: ShieldCheck,
  finance: Landmark,
  reports: BarChart3,
  users: Users,
  locations: MapPin,
  images: ImageIcon,
  settings: Settings,
};

interface AdminWorkspaceContextValue {
  activeKey: string;
  navigate: (key: string) => void;
}

const AdminWorkspaceContext = createContext<AdminWorkspaceContextValue | null>(null);

export function useAdminSection() {
  return useContext(AdminWorkspaceContext);
}

export interface AdminWorkspaceSection {
  key: AdminSectionKey;
  content: ReactNode;
}

interface AdminWorkspaceProps {
  sections: AdminWorkspaceSection[];
  /** Displayed in the sidebar footer. Comes from the verified session. */
  userName?: string;
  roleLabel?: string;
}

function hashSection(): string | null {
  if (typeof window === "undefined") return null;
  return window.location.hash.replace(/^#/, "") || null;
}

function initialKey(sections: AdminWorkspaceSection[]): string {
  const hash = hashSection();
  if (hash && sections.some((section) => section.key === hash)) return hash;
  return sections[0]?.key ?? "dashboard";
}

export default function AdminWorkspace({ sections, userName, roleLabel = "Administrator" }: AdminWorkspaceProps) {
  const [activeKey, setActiveKey] = useState<string>(() => sections[0]?.key ?? "dashboard");
  const [visited, setVisited] = useState<Set<string>>(() => new Set([sections[0]?.key ?? "dashboard"]));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);

  // Deep links (#vehicles, #leads, …) resolve after mount so the server-rendered
  // dashboard and the hydrated view always agree on their first paint.
  useEffect(() => {
    const key = initialKey(sections);
    if (key === activeKey) return;
    // Deferred one microtask so the server-rendered first paint stays stable
    // and hydration never sees a different section.
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setActiveKey(key);
      setVisited((prev) => new Set(prev).add(key));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Browser back/forward and shared hash links keep the workspace in sync.
  useEffect(() => {
    const onHashChange = () => {
      const key = hashSection();
      if (!key || !sections.some((section) => section.key === key)) return;
      setActiveKey(key);
      setVisited((prev) => new Set(prev).add(key));
      setDrawerOpen(false);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [sections]);

  const navigate = useCallback((key: string) => {
    setActiveKey(key);
    setVisited((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    setDrawerOpen(false);
    try {
      window.history.replaceState(null, "", `#${key}`);
    } catch {
      /* replaceState can fail in sandboxed frames — navigation still works. */
    }
  }, []);

  const meta = ADMIN_SECTION_BY_KEY.get(activeKey as AdminSectionKey) ?? ADMIN_SECTION_BY_KEY.get("dashboard")!;

  useEffect(() => {
    document.title = `${meta.label} · Progressive AutoSports Admin`;
  }, [meta.label]);

  // Mobile drawer: Escape closes, body scroll is locked, focus moves in/out.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerCloseRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  const closeDrawer = () => {
    setDrawerOpen(false);
    menuButtonRef.current?.focus();
  };

  const contextValue = useMemo(() => ({ activeKey, navigate }), [activeKey, navigate]);

  return (
    <AdminWorkspaceContext.Provider value={contextValue}>
      <div data-admin-shell className="admin-shell min-h-screen">
        <div className="lg:grid lg:grid-cols-[var(--admin-sidebar-width)_minmax(0,1fr)]">
          {/* Desktop rail */}
          <aside className="hidden border-r border-[hsl(var(--color-line))] bg-[hsl(var(--admin-rail))] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
            <SidebarContent activeKey={activeKey} onNavigate={navigate} userName={userName} roleLabel={roleLabel} />
          </aside>

          {/* Mobile top bar */}
          <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface)/0.94)] px-4 backdrop-blur-md lg:hidden">
            <div className="flex items-center gap-3">
              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open admin navigation"
                aria-expanded={drawerOpen}
                aria-controls="admin-mobile-navigation"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-[hsl(var(--color-line))] bg-[hsl(var(--admin-surface))] text-[hsl(var(--color-content))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))]"
              >
                <Menu size={20} aria-hidden="true" />
              </button>
              <BrandMark compact />
            </div>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-[hsl(var(--color-content-muted))] hover:text-[hsl(var(--color-content))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))]"
            >
              Storefront <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>

          {/* Mobile drawer */}
          {drawerOpen && (
            <div className="fixed inset-0 z-[100] lg:hidden" role="presentation">
              <button
                type="button"
                aria-label="Close admin navigation"
                className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
                onClick={closeDrawer}
              />
              <div
                id="admin-mobile-navigation"
                role="dialog"
                aria-modal="true"
                aria-label="Admin navigation"
                className="absolute inset-y-0 left-0 flex w-[min(320px,88vw)] flex-col border-r border-[hsl(var(--color-line))] bg-[hsl(var(--admin-rail))] shadow-2xl"
              >
                <div className="flex h-16 items-center justify-between border-b border-[hsl(var(--color-line))] px-4">
                  <BrandMark />
                  <button
                    ref={drawerCloseRef}
                    type="button"
                    onClick={closeDrawer}
                    aria-label="Close admin navigation"
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-[hsl(var(--color-content-muted))] hover:bg-[hsl(var(--admin-surface-muted))] hover:text-[hsl(var(--color-content))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))]"
                  >
                    <X size={20} aria-hidden="true" />
                  </button>
                </div>
                <SidebarContent
                  activeKey={activeKey}
                  onNavigate={navigate}
                  userName={userName}
                  roleLabel={roleLabel}
                  onToolNavigate={closeDrawer}
                />
              </div>
            </div>
          )}

          {/* Workspace */}
          <div className="min-w-0">
            <div className="mx-auto w-full max-w-[var(--admin-content-max)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              <PageHeader meta={meta} navigate={navigate} />

              <div className="mt-6">
                {sections.map((section) => {
                  if (!visited.has(section.key)) return null;
                  const sectionMeta = ADMIN_SECTION_BY_KEY.get(section.key);
                  return (
                    <section
                      key={section.key}
                      hidden={section.key !== activeKey}
                      aria-label={sectionMeta?.label ?? section.key}
                    >
                      {section.content}
                    </section>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminWorkspaceContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Brand                                                              */
/* ------------------------------------------------------------------ */

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/portal/admin#dashboard"
      className="flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--color-focus))]"
      aria-label="Progressive AutoSports admin dashboard"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--color-primary))] text-sm font-black text-[hsl(var(--color-primary-foreground))]">
        P
      </span>
      <span className="min-w-0">
        <span className={`block truncate font-bold tracking-tight text-[hsl(var(--color-content))] ${compact ? "text-sm" : "text-[15px]"}`}>
          Progressive AutoSports
        </span>
        <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--color-content-faint))]">
          Admin console
        </span>
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Sidebar                                                            */
/* ------------------------------------------------------------------ */

function SidebarContent({
  activeKey,
  onNavigate,
  userName,
  roleLabel,
  onToolNavigate,
}: {
  activeKey: string;
  onNavigate: (key: string) => void;
  userName?: string;
  roleLabel: string;
  onToolNavigate?: () => void;
}) {
  return (
    <>
      <div className="flex h-16 shrink-0 items-center border-b border-[hsl(var(--color-line))] px-4">
        <BrandMark />
      </div>

      <nav aria-label="Admin navigation" className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-5">
          {ADMIN_NAV_GROUPS.map((group) => (
            <div key={group.key}>
              <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--color-content-faint))]">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={`${item.kind}-${item.key}`}>
                    {item.kind === "section" ? (
                      <SectionNavButton
                        item={item}
                        active={activeKey === item.key}
                        onNavigate={onNavigate}
                      />
                    ) : (
                      <ToolNavLink item={item} onNavigate={onToolNavigate} />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <div className="shrink-0 border-t border-[hsl(var(--color-line))] p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
            {initialsOf(userName)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-[hsl(var(--color-content))]">
              {userName ?? "Admin"}
            </span>
            <span className="block truncate text-[11px] text-[hsl(var(--color-content-muted))]">{roleLabel}</span>
          </span>
        </div>
        <Link
          href="/"
          className="admin-nav-item mt-1 justify-between text-xs"
          onClick={onToolNavigate}
        >
          View storefront <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </>
  );
}

function SectionNavButton({
  item,
  active,
  onNavigate,
}: {
  item: Extract<AdminNavItem, { kind: "section" }>;
  active: boolean;
  onNavigate: (key: string) => void;
}) {
  const Icon = ICONS[item.key] ?? Car;
  return (
    <button
      type="button"
      onClick={() => onNavigate(item.key)}
      aria-current={active ? "page" : undefined}
      className="admin-nav-item"
    >
      <Icon size={17} className={active ? "text-[hsl(var(--color-primary-strong))]" : "text-[hsl(var(--color-content-faint))]"} aria-hidden />
      <span className="truncate">{item.label}</span>
    </button>
  );
}

function ToolNavLink({
  item,
  onNavigate,
}: {
  item: Extract<AdminNavItem, { kind: "tool" }>;
  onNavigate?: () => void;
}) {
  const Icon = ICONS[item.key] ?? Settings;
  return (
    <Link href={item.href} onClick={onNavigate} className="admin-nav-item">
      <Icon size={17} className="text-[hsl(var(--color-content-faint))]" aria-hidden />
      <span className="truncate">{item.label}</span>
      <ArrowUpRight size={13} className="ml-auto text-[hsl(var(--color-content-faint))]" aria-hidden="true" />
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Page header                                                        */
/* ------------------------------------------------------------------ */

function PageHeader({
  meta,
  navigate,
}: {
  meta: AdminSectionMeta;
  navigate: (key: string) => void;
}) {
  const isDashboard = meta.key === "dashboard";
  const isVehicles = meta.key === "vehicles";

  return (
    <header className="mb-1">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-medium text-[hsl(var(--color-content-faint))]">
        <span>Admin</span>
        <ChevronRight size={12} aria-hidden="true" />
        <span>{meta.group}</span>
        <ChevronRight size={12} aria-hidden="true" />
        <span className="text-[hsl(var(--color-content-muted))]" aria-current="page">
          {meta.label}
        </span>
      </nav>

      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--color-content))] sm:text-3xl">
            {meta.label}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[hsl(var(--color-content-muted))]">
            {meta.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isDashboard && (
            <button type="button" onClick={() => navigate("leads")} className="admin-btn admin-btn-secondary">
              <MessageSquare size={16} aria-hidden="true" />
              Review leads
            </button>
          )}
          {(isDashboard || isVehicles) && (
            <Link href="/admin/vehicles/new" className="admin-btn admin-btn-primary">
              <Car size={16} aria-hidden="true" />
              Add vehicle
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function initialsOf(name?: string) {
  return (name ?? "Admin")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
