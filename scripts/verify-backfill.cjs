const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function check() {
  const result = await prisma.$queryRawUnsafe('SELECT v.id, v.title, COUNT(vi.id) as gallery_count FROM "Vehicle" v LEFT JOIN "VehicleImage" vi ON vi."vehicleId" = v.id GROUP BY v.id, v.title HAVING COUNT(vi.id) > 0 ORDER BY v.id');
  console.log(JSON.stringify(result, null, 2));
  await prisma.$disconnect();
}

check().catch(console.error);