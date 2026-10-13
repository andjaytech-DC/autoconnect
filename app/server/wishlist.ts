import { getDb, newId, updateDb } from "./db";
import type { WishlistItem } from "./types";

export async function listWishlist(userId: string): Promise<WishlistItem[]> {
  const db = await getDb();
  return db.wishlist
    .filter((w) => w.userId === userId)
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}

/** Returns the new item, or null when the car was already saved. */
export async function addToWishlist(
  userId: string,
  carId: number,
): Promise<WishlistItem | null> {
  const existing = await listWishlist(userId);
  if (existing.some((w) => w.carId === carId)) return null;

  const { result } = await updateDb((db) => {
    const item: WishlistItem = {
      id: newId("wsh"),
      userId,
      carId,
      addedAt: new Date().toISOString(),
    };
    db.wishlist.push(item);
    return item;
  });
  return result;
}

export async function removeFromWishlist(
  userId: string,
  carId: number,
): Promise<boolean> {
  const { result } = await updateDb((db) => {
    const before = db.wishlist.length;
    db.wishlist = db.wishlist.filter(
      (w) => !(w.userId === userId && w.carId === carId),
    );
    return db.wishlist.length < before;
  });
  return result;
}