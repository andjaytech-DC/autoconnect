const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function backfillVehicleImages() {
  console.log('Starting VehicleImage backfill...');

  const vehicles = await prisma.vehicle.findMany({
    where: {
      images: {
        not: [],
      },
    },
    include: {
      gallery: true,
    },
  });

  console.log(`Found ${vehicles.length} vehicles with images in legacy array`);

  let created = 0;
  let skipped = 0;

  for (const vehicle of vehicles) {
    if (vehicle.gallery.length > 0) {
      console.log(`  Vehicle ${vehicle.id} (${vehicle.title}) already has ${vehicle.gallery.length} gallery images - skipping`);
      skipped++;
      continue;
    }

    const images = vehicle.images || [];
    if (images.length === 0) continue;

    const galleryData = images.map((imageUrl, index) => ({
      vehicleId: vehicle.id,
      imageUrl,
      altText: `${vehicle.title} ${index === 0 ? 'primary' : `photo ${index + 1}`}`,
      isPrimary: index === 0,
      sortOrder: index,
    }));

    await prisma.vehicleImage.createMany({
      data: galleryData,
    });

    console.log(`  Created ${galleryData.length} VehicleImage records for vehicle ${vehicle.id} (${vehicle.title})`);
    created += galleryData.length;
  }

  console.log(`\nBackfill complete:`);
  console.log(`  Vehicles processed: ${vehicles.length}`);
  console.log(`  Gallery images created: ${created}`);
  console.log(`  Vehicles skipped (already had gallery): ${skipped}`);
}

backfillVehicleImages()
  .catch((e) => {
    console.error('Backfill failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });