import { NextResponse } from "next/server";

import { prisma } from "@/app/server/prisma";

/** GET /api/new-cars — public: list new cars with optional brand/electric filters. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brand = searchParams.get("brand");
  const isElectric = searchParams.get("electric");
  const where = {
    ...(brand ? { brandName: { equals: brand, mode: "insensitive" as const } } : {}),
    ...(isElectric === "true" ? { isElectric: true } : {}),
  };
  const cars = await prisma.newCar.findMany({ where, orderBy: [{ brandName: "asc" }, { model: "asc" }] });
  const brands = await prisma.newCar.findMany({ distinct: ["brandName"], select: { brandName: true }, orderBy: { brandName: "asc" } });
  return NextResponse.json({ cars, brands: brands.map((b) => b.brandName) });
}
