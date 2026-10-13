SELECT v.id, v.title, COUNT(vi.id) as gallery_count
FROM "Vehicle" v
LEFT JOIN "VehicleImage" vi ON vi."vehicleId" = v.id
GROUP BY v.id, v.title
HAVING COUNT(vi.id) > 0
ORDER BY v.id;