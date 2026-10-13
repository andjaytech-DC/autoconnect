const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const result = await prisma.$queryRawUnsafe('SELECT v.id, v.title, COUNT(vi.id) as gallery_count FROM "Vehicle" v LEFT JOIN "VehicleImage" vi ON vi."vehicleId" = v.id GROUP BY v.id, v.title HAVING COUNT(vi.id) > 0 ORDER BY v.id');
  console.log(result);
  await prisma.$disconnect();
}

check().catch(console.error);