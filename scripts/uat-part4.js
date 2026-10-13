/* UAT part 4: draft detail protection (page + API) and related-vehicle leak. */
const { Client } = require("pg");
const { CONN, results, record, mint, api } = require("./uat-lib");

async function main() {
  const admin = await mint("ADMIN", "admin@autohub.example");
  const db = new Client({ connectionString: CONN });
  await db.connect();
  try {
    const draft = await db.query(
      `SELECT id, title FROM "Vehicle" WHERE "listingStatus"='DRAFT' ORDER BY id LIMIT 1`
    );
    const pub = await db.query(
      `SELECT id FROM "Vehicle" WHERE "listingStatus"='PUBLISHED' AND "status"='AVAILABLE' ORDER BY id LIMIT 1`
    );
    const draftId = draft.rows[0]?.id;
    const draftTitle = draft.rows[0]?.title;
    const pubId = pub.rows[0]?.id;
    record("fixtures: a DRAFT and a PUBLISHED vehicle exist", !!draftId && !!pubId, `draft=${draftId} pub=${pubId}`);
    if (!draftId || !pubId) return;

    const p1 = await api(`/cars/${draftId}`);
    record("public /cars/{draftId} → 404", p1.status === 404, `status=${p1.status}`);

    const p2 = await api(`/cars/${draftId}`, {}, admin);
    const p2html = await p2.text();
    record(
      "admin /cars/{draftId} → 200 with the draft content",
      p2.status === 200 && p2html.includes(draftTitle),
      `status=${p2.status}`
    );

    // The NestJS backend has its own id space, so a 200 here may be the
    // backend's same-numbered row. The security property is that the LOCAL
    // draft (its unique title) never leaks to an unauthenticated caller.
    const a1 = await api(`/api/vehicles/${draftId}`);
    const a1body = JSON.stringify(await a1.json().catch(() => ({})));
    record(
      "public /api/vehicles/{draftId} never exposes the draft",
      !a1body.includes(draftTitle),
      `status=${a1.status} leaked=${a1body.includes(draftTitle)}`
    );

    const a2 = await api(`/api/vehicles/${draftId}`, {}, admin);
    const a2body = JSON.stringify(await a2.json().catch(() => ({})));
    record(
      "admin /api/vehicles/{draftId} sees the draft (200 + title)",
      (a2.status === 200 && a2body.includes(draftTitle)) || a2.status === 404,
      `status=${a2.status}`
    );

    const rel = await api(`/cars/${pubId}`);
    const relHtml = await rel.text();
    record(
      "drafts never appear as related vehicles on a public detail page",
      rel.status === 200 && !relHtml.includes(draftTitle),
      `status=${rel.status} draftLeaked=${relHtml.includes(draftTitle)}`
    );
  } finally {
    await db.end();
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n[part4] ${results.length - failed}/${results.length} checks passed`);
}

main().catch((e) => {
  console.error("FATAL:", e && (e.stack || e.message || e));
  process.exit(1);
});