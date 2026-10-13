import { getDb } from "./db";
import type { Order } from "./types";

export async function listOrders(userId: string): Promise<Order[]> {
  const db = await getDb();
  return db.orders
    .filter((o) => o.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}