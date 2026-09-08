import { Skeleton } from "@/components/ui/skeleton";

export function PendingScreen() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="mt-4 h-10 w-64 sm:w-96" />
      <p className="mt-3 text-sm text-muted">Pulling the latest PA slate…</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
    </div>
  );
}
