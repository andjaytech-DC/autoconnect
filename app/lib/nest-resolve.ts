import type { NestBrand, NestCategory } from "./nest-types";
import { nest } from "./nest";

/** Category name/slug → backend categoryId. */
export async function resolveCategoryId(
  type: string | null | undefined,
): Promise<number | undefined> {
  if (!type) return undefined;
  const slug = type.toLowerCase().replace(/\s+/g, "-");
  try {
    const categories = await nest<NestCategory[]>("/categories");
    const list = categories ?? [];
    const found = list.find(
      (c) => c.slug === slug || c.name.toLowerCase() === type.toLowerCase(),
    );
    return found?.id;
  } catch {
    return undefined;
  }
}

/** Brand name → backend brandId. */
export async function resolveBrandId(
  brand: string | null | undefined,
): Promise<number | undefined> {
  if (!brand) return undefined;
  try {
    const brands = await nest<NestBrand[]>("/brands");
    const found = (brands ?? []).find(
      (b) => b.name.toLowerCase() === brand.toLowerCase(),
    );
    return found?.id;
  } catch {
    return undefined;
  }
}

