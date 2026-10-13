/* UAT part 1: authorization, fixture creation, lifecycle buckets, draft protection. */
const { fs, path, Client, CONN, results, record, mint, api } = require("./uat-lib");
const { STAMP, ensureFixtures, createVehicle, vehiclePayload } = require("./uat-fixtures");

async function main() {
  const db = new Client({ connectionString: CONN });
  await db.connect();

  const admin = await mint("ADMIN", "admin@autohub.example");
  const customer = await mint("CUSTOMER", "customer@example.com");

  // ---------- AUTHORIZATION ----------
  const a1 = await api("/admin/vehicles");
  record(
    "unauth /admin/vehicles redirects to /login",
    [301, 302, 307, 308].includes(a1.status) && (a1.headers.get("location") || "").includes("/login"),
    `status=${a1.status} loc=${a1.headers.get("location")}`
  );

  const a2 = await api("/admin/vehicles/1/edit");
  record(
    "unauth /admin/vehicles/1/edit redirects to /login",
    [301, 302, 307, 308].includes(a2.status) && (a2.headers.get("location") || "").includes("/login"),
    `status=${a2.status} loc=${a2.headers.get("location")}`
  );

  const a3 = await api("/admin/vehicles", {}, customer);
  const loc3 = a3.headers.get("location") || "";
  record(
    "non-admin (CUSTOMER) cannot reach /admin/vehicles",
    [301, 302, 307, 308].includes(a3.status) && !loc3.includes("/admin/vehicles"),
    `status=${a3.status} loc=${loc3}`
  );

  // ---------- CREATE ----------
  const fx = await ensureFixtures(db);

  // A CUSTOMER session with a fully valid payload must still be refused —
  // creating inventory is an admin/dealer capability.
  const a4 = await api(
    "/api/vehicles",
    {
      method: "POST",
      body: JSON.stringify(vehiclePayload(fx, `UAT Customer ${STAMP}`, "PUBLISHED", "AVAILABLE")),
    },
    customer
  );
  record(
    "CUSTOMER cannot POST /api/vehicles (valid payload)",
    a4.status === 401 || a4.status === 403,
    `status=${a4.status}`
  );
  const vDraft = await createVehicle(admin, fx, `UAT Draft ${STAMP}`, "DRAFT", "AVAILABLE");
  const vAvail = await createVehicle(admin, fx, `UAT Pub Available ${STAMP}`, "PUBLISHED", "AVAILABLE");
  const vRes = await createVehicle(admin, fx, `UAT Pub Reserved ${STAMP}`, "PUBLISHED", "RESERVED");
  const vSold = await createVehicle(admin, fx, `UAT Pub Sold ${STAMP}`, "PUBLISHED", "SOLD");
  const vArch = await createVehicle(admin, fx, `UAT Pub Archived ${STAMP}`, "PUBLISHED", "INACTIVE");

  const ids = [vDraft, vAvail, vRes, vSold, vArch].filter(Boolean);
  const rows = await db.query(
    `SELECT id, "listingStatus", "status" FROM "Vehicle" WHERE id = ANY($1::int[]) ORDER BY id`,
    [ids]
  );
  const byId = Object.fromEntries(rows.rows.map((r) => [r.id, r]));
  record(
    "DB rows persisted with correct listingStatus + status",
    byId[vDraft]?.listingStatus === "DRAFT" &&
      byId[vAvail]?.listingStatus === "PUBLISHED" && byId[vAvail]?.status === "AVAILABLE" &&
      byId[vRes]?.status === "RESERVED" && byId[vSold]?.status === "SOLD" &&
      byId[vArch]?.status === "INACTIVE",
    JSON.stringify(rows.rows)
  );

  // ---------- PUBLIC DRAFT PROTECTION ----------
  // The NestJS backend has its own id space, so match on the UNIQUE title
  // rather than the id when deciding whether our local draft leaked.
  const draftTitle = `UAT Draft ${STAMP}`;
  const leaks = (list) =>
    list.some((v) => String(v.title ?? v.name ?? "").includes(draftTitle));

  const pub = await api("/api/vehicles?limit=200");
  const pubList = (await pub.json().catch(() => ({}))).vehicles || [];
  record(
    "public GET /api/vehicles excludes the DRAFT",
    pub.status === 200 && !leaks(pubList),
    `status=${pub.status} n=${pubList.length} draftPresent=${leaks(pubList)}`
  );

  const p2 = await api("/api/vehicles?includeDrafts=1&limit=200");
  const p2List = (await p2.json().catch(() => ({}))).vehicles || [];
  record(
    "includeDrafts=1 unauthenticated still excludes the DRAFT",
    !leaks(p2List),
    `n=${p2List.length} draftPresent=${leaks(p2List)}`
  );

  const p3 = await api("/api/vehicles?includeDrafts=1&limit=200", {}, admin);
  const p3List = (await p3.json().catch(() => ({}))).vehicles || [];
  record(
    "includeDrafts=1 as ADMIN can see the DRAFT",
    leaks(p3List),
    `n=${p3List.length} draftPresent=${leaks(p3List)}`
  );

  fs.writeFileSync(
    path.join(__dirname, ".uat-state.json"),
    JSON.stringify({ admin, customer, fx, vDraft, vAvail, vRes, vSold, vArch, stamp: STAMP })
  );
  await db.end();

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n[part1] ${results.length - failed}/${results.length} checks passed`);
}

main().catch((e) => {
  console.error("FATAL:", e && (e.stack || e.message || e));
  process.exit(1);
});