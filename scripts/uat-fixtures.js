/* UAT: admin vehicle dashboard — exercises the REAL HTTP APIs + DB. */
const { fs, path, Client, BASE, COOKIE, CONN, record, mint, api } = require("./uat-lib");

const STAMP = Date.now().toString(36);

async function ensureFixtures(db) {
  await db.query(
    `INSERT INTO "Brand"(name, slug, country, "isActive", "createdAt")
     VALUES('UAT Brand','uat-brand','India',true,now()) ON CONFLICT (slug) DO NOTHING`
  );
  await db.query(
    `INSERT INTO "Category"(name, slug, "isActive", "createdAt")
     VALUES('UAT SUV','uat-suv',true,now()) ON CONFLICT (slug) DO NOTHING`
  );
  await db.query(
    `INSERT INTO "Dealer"("businessName", city, state, email, phone, "isActive", status, "createdAt", "updatedAt")
     VALUES('UAT Motors','Noida','Uttar Pradesh','uat-dealer@example.com','9000000000',true,'APPROVED',now(),now())
     ON CONFLICT (email) DO NOTHING`
  );
  const b = await db.query(`SELECT id FROM "Brand" WHERE slug='uat-brand'`);
  const c = await db.query(`SELECT id FROM "Category" WHERE slug='uat-suv'`);
  const d = await db.query(`SELECT id FROM "Dealer" WHERE email='uat-dealer@example.com'`);
  return { brandId: b.rows[0].id, categoryId: c.rows[0].id, dealerId: d.rows[0].id };
}

function vehiclePayload(fx, title, listingStatus, status) {
  return {
    title,
    price: 850000,
    year: 2021,
    mileage: 42000,
    fuel: "PETROL",
    transmission: "MANUAL",
    color: "Silver",
    bodyType: "SUV",
    city: "Noida",
    state: "Uttar Pradesh",
    images: ["/uploads/uat-fixture.webp"],
    brandId: fx.brandId,
    categoryId: fx.categoryId,
    dealerId: fx.dealerId,
    listingStatus,
    status,
  };
}

async function createVehicle(admin, fx, title, listingStatus, status) {
  const res = await api(
    "/api/vehicles",
    { method: "POST", body: JSON.stringify(vehiclePayload(fx, title, listingStatus, status)) },
    admin
  );
  const body = await res.json().catch(() => ({}));
  const id = body?.data?.id ?? null;
  record(
    `create vehicle ${listingStatus}/${status}`,
    res.status === 201 && !!id,
    `status=${res.status} id=${id}`
  );
  return id;
}

module.exports = { STAMP, ensureFixtures, vehiclePayload, createVehicle };