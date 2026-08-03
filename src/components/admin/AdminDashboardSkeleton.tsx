export function AdminDashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-3">
        <div className="h-4 w-48 rounded bg-zinc-200" />
        <div className="h-10 w-80 max-w-full rounded bg-zinc-200" />
        <div className="h-4 w-96 max-w-full rounded bg-zinc-200" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-36 rounded-[14px] border border-zinc-200 bg-white" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="h-96 rounded-[14px] border border-zinc-200 bg-white" />
        <div className="h-96 rounded-[14px] border border-zinc-200 bg-white" />
      </div>
    </div>
  )
}
