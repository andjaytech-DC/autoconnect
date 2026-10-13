import { NextResponse } from "next/server";

import { prisma } from "@/app/server/prisma";

/** GET /api/marketplace — public: list marketplace products. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const products = await prisma.marketplaceProduct.findMany({
    where: { isActive: true, ...(category ? { category } : {}) },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ products });
}
