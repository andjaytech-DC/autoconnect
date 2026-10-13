/* UAT part 2: edit/PATCH, audit log, image cleanup. */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { CONN, results, record, api } = require("./uat-lib");

const state = JSON.parse(fs.readFileSync(path.join(__dirname, ".uat-state.json"), "utf8"));
const { admin, vDraft, stamp } = state;

const UPLOADS = path.join(__dirname, "..", "public", "uploads");
const asset = `/uploads/uat-${stamp}.webp`;

async function main() {
  const db = new Client({ connectionString: CONN });
  await db.connect();

  // ---------- EDIT (PATCH) ----------
  const newTitle = `UAT Draft ${stamp} (edited)`;
  const edit = await api(
    `/api/vehicles/${vDraft}`,
    {
      method: "PATCH",
      body: JSON.stringify({ title: newTitle, price: 975000, listingStatus: "PUBLISHED" }),
    },
    admin
  );
  record("PATCH /api/vehicles/{id} succeeds", edit.status === 200, `status=${edit.status}`);

  const row = await db.query(
    `SELECT title, price, "listingStatus" FROM "Vehicle" WHERE id = $1`,
    [vDraft]
  );
  record(
    "DB reflects the edit (title/price/listingStatus DRAFT→PUBLISHED)",
    row.rows[0]?.title === newTitle &&
      row.rows[0]?.price === 975000 &&
      row.rows[0]?.listingStatus === "PUBLISHED",
    JSON.stringify(row.rows[0])
  );

  const count = await db.query(`SELECT count(*)::int AS n FROM "Vehicle"`);
  record(
    "edit created NO extra row (PATCH semantics, not POST)",
    count.rows[0].n === 15,
    `total=${count.rows[0].n}`
  );

  // ---------- AUDIT LOG ----------
  const audit = await db.query(
    `SELECT "action", "entity", "entityId", "metadata", "userId"
       FROM "AuditLog"
      WHERE "entityId" = $1 AND "action" = 'VEHICLE_UPDATE'
      ORDER BY "createdAt" DESC LIMIT 1`,
    [String(vDraft)]
  );
  const meta = audit.rows[0]?.metadata ?? {};
  const changed = meta.changedFields || [];
  record(
    "AuditLog VEHICLE_UPDATE (user, changed fields, listingStatus from→to)",
    audit.rows.length === 1 &&
      !!audit.rows[0].userId &&
      changed.includes("listingStatus") &&
      changed.includes("title") &&
      meta.listingStatus?.from === "DRAFT" &&
      meta.listingStatus?.to === "PUBLISHED",
    `userId=${audit.rows[0]?.userId} changedFields=${JSON.stringify(changed)} listingStatus=${JSON.stringify(meta.listingStatus)}`
  );

  // ---------- IMAGE CLEANUP ----------
  fs.mkdirSync(UPLOADS, { recursive: true });
  fs.writeFileSync(path.join(UPLOADS, `uat-${stamp}.webp`), Buffer.from("uat-bytes"));

  const unauth = await api("/api/upload/cleanup", {
    method: "POST",
    body: JSON.stringify({ urls: [asset] }),
  });
  const stillThere = fs.existsSync(path.join(UPLOADS, `uat-${stamp}.webp`));
  record(
    "cleanup unauthenticated → 401, file untouched",
    unauth.status === 401 && stillThere,
    `status=${unauth.status} fileStillExists=${stillThere}`
  );

  const del = await api(
    "/api/upload/cleanup",
    { method: "POST", body: JSON.stringify({ urls: [asset] }) },
    admin
  );
  const gone = !fs.existsSync(path.join(UPLOADS, `uat-${stamp}.webp`));
  record(
    "cleanup as ADMIN physically deletes the managed /uploads asset",
    del.status === 200 && gone,
    `status=${del.status} fileDeleted=${gone}`
  );

  const external = await api(
    "/api/upload/cleanup",
    { method: "POST", body: JSON.stringify({ urls: ["https://example.com/uat-external.jpg"] }) },
    admin
  );
  record(
    "external URL cleanup is best-effort (no 500)",
    external.status === 200,
    `status=${external.status}`
  );

  await db.end();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n[part2] ${results.length - failed}/${results.length} checks passed`);
}

main().catch((e) => {
  console.error("FATAL:", e && (e.stack || e.message || e));
  process.exit(1);
});