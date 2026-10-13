/**
 * Single public-read barrel for migrated UI (Phase 0/1).
 * Re-exports the central NestJS client, types, mappers, catalog reads,
 * and filter resolvers so pages import from ONE place.
 */
export * from "./nest";
export * from "./nest-types";
export * from "./nest-images";
export * from "./nest-mappers";
export * from "./nest-catalog";
export * from "./nest-resolve";

export interface VehiclesMetaShim {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
