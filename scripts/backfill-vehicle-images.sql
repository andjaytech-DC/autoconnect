INSERT INTO "VehicleImage" ("vehicleId", "imageUrl", "altText", "isPrimary", "sortOrder", "createdAt")
SELECT 
  v.id,
  img,
  v.title || ' ' || CASE WHEN idx = 0 THEN 'primary' ELSE 'photo ' || (idx + 1)::text END,
  idx = 0,
  idx,
  now()
FROM "Vehicle" v
CROSS JOIN LATERAL unnest(v.images) WITH ORDINALITY AS u(img, idx)
WHERE array_length(v.images, 1) > 0
  AND NOT EXISTS (
    SELECT 1 FROM "VehicleImage" vi WHERE vi."vehicleId" = v.id
  );