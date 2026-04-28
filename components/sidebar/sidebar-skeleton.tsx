import { Skeleton } from "@/components/ui/skeleton"

export function SidebarSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col items-center gap-3 ">
        <Skeleton className="w-24 h-24 rounded-full bg-secondary" />
        <Skeleton className="h-6 w-40 bg-secondary" />
        <Skeleton className="h-4 w-20 bg-secondary" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-16 rounded-xl bg-secondary" />
        <Skeleton className="h-16 rounded-xl bg-secondary" />
        <Skeleton className="h-16 rounded-xl bg-secondary" />
        <Skeleton className="h-16 rounded-xl bg-secondary" />
      </div>
      <Skeleton className="h-20 rounded-xl bg-secondary" />
      <Skeleton className="h-32 rounded-xl bg-secondary" />
    </div>
  )
}
