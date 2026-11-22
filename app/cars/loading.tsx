import { CardGridSkeleton, PageHeaderSkeleton } from "@/app/components/ui/Skeleton";

export default function Loading() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="page-container py-10">
        <CardGridSkeleton count={8} label="Loading cars" />
      </div>
    </>
  );
}
