import { DetailSkeleton } from "@/app/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="page-container py-10">
      <DetailSkeleton label="Loading vehicle" />
    </div>
  );
}
