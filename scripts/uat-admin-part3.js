/* UAT part 3: dashboard metric consistency, inventory grid, edit prefill. */
const fs = require("fs");
const path = require("path");
const { BASE, results, record, api } = require("./uat-lib");

const state = JSON.parse(fs.readFileSync(path.join(__dirname, ".uat-state.json"), "utf8"));
const { admin, vRes, stamp } = state;

const getNum = (html, label) => {
  const re = new RegExp(`<p[^>]*>\\s*(\\d+)\\s*</p>\\s*<p[^>]*>\\s*${label}\\s*</p>`);
  return re.exec(html)?.[1] ?? null;
};

async function main() {
  // ---------- /portal/admin (hero + panel from ONE dataset) ----------
  const portal = await api("/portal/admin", {}, admin);
  const html = await portal.text();

  const hero = /(\d+) published · (\d+) drafts/.exec(html);
  const pTotal = getNum(html, "Total Vehicles");
  const pDraft = getNum(html, "Drafts");
  const pPub = getNum(html, "Published");
  const pRes = getNum(html, "Reserved");
  const pSold = getNum(html, "Sold");
  const pArch = getNum(html, "Archived");

  record("portal/admin renders for ADMIN", portal.status === 200, `status=${portal.status}`);

  record(
    "hero shows 'N published · M drafts' (never 'N available')",
    !!hero,
    hero ? `hero=${hero[0]}` : "pattern not found"
  );

  record(
    "hero counts == AdminPanel bucket counts (ONE dataset)",
    !!hero && hero[1] === pPub && hero[2] === pDraft,
    `hero=${hero?.[0]} | panel total=${pTotal} draft=${pDraft} pub=${pPub} res=${pRes} sold=${pSold} arch=${pArch}`
  );

  record(
    "buckets partition cleanly (total == drafts + published)",
    pTotal !== null && Number(pTotal) === Number(pDraft) + Number(pPub),
    `total=${pTotal} draft+pub=${Number(pDraft) + Number(pPub)}`
  );

  record(
    "lifecycle buckets populated (reserved/sold/archived ≥ 1)",
    Number(pRes) >= 1 && Number(pSold) >= 1 && Number(pArch) >= 1,
    `res=${pRes} sold=${pSold} arch=${pArch}`
  );

  record(
    "leads metric is truthful (no unexplained 'N% conversion' beside zero)",
    (html.includes("No leads yet") || html.includes("Lead conversion")) &&
      !html.includes("% conversion"),
    "zero-state or explicitly-labelled conversion"
  );

  // ---------- /admin/vehicles (grid) ----------
  const inv = await api("/admin/vehicles", {}, admin);
  const invHtml = await inv.text();
  record(
    "/admin/vehicles renders the UAT vehicles (grid populated)",
    inv.status === 200 && invHtml.includes(`UAT Pub Reserved ${stamp}`),
    `status=${inv.status}`
  );
  record(
    "inventory shows distinguishable DRAFT/PUBLISHED + lifecycle badges",
    ["DRAFT", "PUBLISHED", "RESERVED", "SOLD", "INACTIVE"].every((b) => invHtml.includes(b)),
    "badges present"
  );
  record(
    "inventory cards link to /admin/vehicles/{id}/edit",
    invHtml.includes(`/admin/vehicles/${vRes}/edit`),
    "edit href present"
  );

  // ---------- EDIT PAGE PREFILL ----------
  const editPage = await api(`/admin/vehicles/${vRes}/edit`, {}, admin);
  const ep = await editPage.text();
  record(
    "edit page pre-fills title, listing visibility, status, images",
    editPage.status === 200 &&
      ep.includes(`UAT Pub Reserved ${stamp}`) &&
      ep.includes("Listing Visibility") &&
      ep.includes("RESERVED") &&
      ep.includes("/uploads/uat-fixture.webp"),
    `status=${editPage.status}`
  );

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n[part3] ${results.length - failed}/${results.length} checks passed`);
}

main().catch((e) => {
  console.error("FATAL:", e && (e.stack || e.message || e));
  process.exit(1);
});