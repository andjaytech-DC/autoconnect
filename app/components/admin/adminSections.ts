/**
 * Admin information architecture — one definition for the sidebar grouping,
 * page headers and (where relevant) deep-link hashes.
 *
 * Every key here maps to a real section rendered on /portal/admin or to a real
 * standalone tool route. Nothing points at a page that does not exist.
 */

export type AdminSectionKey =
  | "dashboard"
  | "vehicles"
  | "dealers"
  | "customers"
  | "listings"
  | "new-cars"
  | "leads"
  | "test-drives"
  | "inspections"
  | "services"
  | "insurance"
  | "security"
  | "trust";

export interface AdminSectionMeta {
  key: AdminSectionKey;
  label: string;
  /** Short, factual explanation shown under the page title. */
  description: string;
  /** Sidebar group. */
  group: "Overview" | "Marketplace" | "Operations" | "Trust & Safety";
}

export const ADMIN_SECTION_META: AdminSectionMeta[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    description: "A live overview of inventory, demand and operational queues.",
    group: "Overview",
  },
  {
    key: "vehicles",
    label: "Vehicles",
    description: "Search, filter and manage every vehicle in the marketplace.",
    group: "Marketplace",
  },
  {
    key: "dealers",
    label: "Dealers",
    description: "Review dealer applications and manage approved partners.",
    group: "Marketplace",
  },
  {
    key: "customers",
    label: "Customers",
    description: "Registered customer accounts across the marketplace.",
    group: "Marketplace",
  },
  {
    key: "listings",
    label: "Seller Listings",
    description: "Vehicles submitted by sellers that are waiting for review.",
    group: "Marketplace",
  },
  {
    key: "new-cars",
    label: "New Cars",
    description: "Manage the new-car catalogue and launch inventory.",
    group: "Marketplace",
  },
  {
    key: "leads",
    label: "Leads",
    description: "Customer enquiries and the follow-up pipeline.",
    group: "Operations",
  },
  {
    key: "test-drives",
    label: "Test Drives",
    description: "Test drive requests submitted from vehicle pages.",
    group: "Operations",
  },
  {
    key: "inspections",
    label: "Inspections",
    description: "Inspection requests, scheduling and completion.",
    group: "Operations",
  },
  {
    key: "services",
    label: "Services",
    description: "Service bookings, providers and workshop operations.",
    group: "Operations",
  },
  {
    key: "insurance",
    label: "Insurance",
    description: "Insurance enquiries and quote requests.",
    group: "Operations",
  },
  {
    key: "security",
    label: "Security",
    description: "Role and permission matrix for the admin workspace.",
    group: "Trust & Safety",
  },
  {
    key: "trust",
    label: "Trust & Safety",
    description: "Vehicle history checks, warranty plans and return requests.",
    group: "Trust & Safety",
  },
];

export const ADMIN_SECTION_BY_KEY = new Map(
  ADMIN_SECTION_META.map((section) => [section.key, section]),
);

export interface AdminToolMeta {
  key: string;
  label: string;
  href: string;
  description: string;
}

/** Standalone tools. `href` is the real route rendered by app/admin/*. */
export const ADMIN_TOOL_META: AdminToolMeta[] = [
  {
    key: "finance",
    label: "Finance",
    href: "/admin/finance",
    description: "Loan applications, review status and disbursement pipeline.",
  },
  {
    key: "reports",
    label: "Reports",
    href: "/admin/reports",
    description: "Marketplace performance and operational reporting.",
  },
  {
    key: "users",
    label: "Users & Roles",
    href: "/admin/users",
    description: "Manage accounts, roles and access to the workspace.",
  },
  {
    key: "locations",
    label: "Locations",
    href: "/admin/locations",
    description: "Cities and service locations available to the marketplace.",
  },
  {
    key: "images",
    label: "Images",
    href: "/admin/images",
    description: "Vehicle media library, uploads and image hygiene.",
  },
  {
    key: "settings",
    label: "Settings",
    href: "/admin/settings",
    description: "Platform configuration and operational preferences.",
  },
];

export const ADMIN_TOOL_BY_KEY = new Map(
  ADMIN_TOOL_META.map((tool) => [tool.key, tool]),
);

export type AdminNavItem =
  | { kind: "section"; key: AdminSectionKey; label: string }
  | { kind: "tool"; key: string; label: string; href: string };

export interface AdminNavGroup {
  key: string;
  label: string;
  items: AdminNavItem[];
}

const section = (key: AdminSectionKey): AdminNavItem => ({
  kind: "section",
  key,
  label: ADMIN_SECTION_BY_KEY.get(key)?.label ?? key,
});

const tool = (key: string): AdminNavItem => {
  const meta = ADMIN_TOOL_BY_KEY.get(key);
  return { kind: "tool", key, label: meta?.label ?? key, href: meta?.href ?? "#" };
};

/**
 * Grouped navigation. Finance lives with Operations because it is an
 * operational queue; the remaining tools share Management. All routes exist.
 */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    key: "overview",
    label: "Overview",
    items: [section("dashboard")],
  },
  {
    key: "marketplace",
    label: "Marketplace",
    items: [
      section("vehicles"),
      section("dealers"),
      section("customers"),
      section("listings"),
      section("new-cars"),
    ],
  },
  {
    key: "operations",
    label: "Operations",
    items: [
      section("leads"),
      section("test-drives"),
      section("inspections"),
      section("services"),
      section("insurance"),
      tool("finance"),
    ],
  },
  {
    key: "trust",
    label: "Trust & Safety",
    items: [section("security"), section("trust")],
  },
  {
    key: "management",
    label: "Management",
    items: [
      tool("reports"),
      tool("users"),
      tool("locations"),
      tool("images"),
      tool("settings"),
    ],
  },
];
