/* Read-only DB status probe using the pg driver (no writes, no resets). */
const { Client } = require("pg");

const conn =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:51214/autoconnect?sslmode=disable";

async function main() {
  const client = new Client({ connectionString: conn });
  await client.connect();
  try {
    const cols = await client.query(
      `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
        WHERE table_name = 'Vehicle'
          AND column_name IN ('listingStatus','status')
        ORDER BY column_name`
    );
    console.log("Vehicle columns:", JSON.stringify(cols.rows));

    const total = await client.query(`SELECT count(*)::int AS n FROM "Vehicle"`);
    console.log("Total vehicles:", total.rows[0].n);

    const byListing = await client.query(
      `SELECT "listingStatus", count(*)::int AS n FROM "Vehicle" GROUP BY 1 ORDER BY 1`
    );
    console.log("By listingStatus:", JSON.stringify(byListing.rows));

    const byStatus = await client.query(
      `SELECT "status", count(*)::int AS n FROM "Vehicle" GROUP BY 1 ORDER BY 1`
    );
    console.log("By status:", JSON.stringify(byStatus.rows));

    const sample = await client.query(
      `SELECT id, title, "status", "listingStatus" FROM "Vehicle" ORDER BY "updatedAt" DESC LIMIT 5`
    );
    console.log("Latest 5:", JSON.stringify(sample.rows, null, 2));

    const migs = await client.query(
      `SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at DESC LIMIT 10`
    );
    console.log("Migration history:", JSON.stringify(migs.rows, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
