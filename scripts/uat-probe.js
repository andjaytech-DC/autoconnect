/* Probe: what does /portal/admin actually render? */
const fs = require("fs");
const path = require("path");
const { BASE, api } = require("./uat-lib");

async function main() {
  const state = JSON.parse(fs.readFileSync(path.join(__dirname, ".uat-state.json"), "utf8"));
  const res = await api("/portal/admin", {}, state.admin);
  const html = await res.text();
  console.log("status:", res.status, "len:", html.length);
  const probes = [
    "published · ",
    "published &#183; ",
    "Admin workspace unavailable",
    "Build Error",
    "Application error",
    "Total Vehicles",
    "Drafts",
    "No leads yet",
    "% conversion",
    "UAT Pub Reserved",
  ];
  for (const p of probes) {
    console.log(JSON.stringify(p), "→", html.includes(p));
  }
  const i = html.indexOf("Total Vehicles");
  if (i >= 0) console.log("ctx:", JSON.stringify(html.slice(i - 400, i + 400)));

  const inv = await api("/admin/vehicles", {}, state.admin);
  const invHtml = await inv.text();
  console.log("inventory contains edited title:", invHtml.includes("(edited)"));
}

main().catch((e) => {
  console.error("FATAL:", e && (e.stack || e.message || e));
  process.exit(1);
});