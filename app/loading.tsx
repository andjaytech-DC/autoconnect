import { ListSkeleton, PageHeaderSkeleton } from "@/app/components/ui/Skeleton";

/**
 * Fallback for any route that doesn't define its own `loading.tsx`. Shown
 * instantly while the page streams in, with the same header footprint as
 * <PageHeader> so nothing jumps.
 */
export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="page-container py-10">
        <ListSkeleton rows={4} label="Loading page" />
      </div>
    </>
  );
}
