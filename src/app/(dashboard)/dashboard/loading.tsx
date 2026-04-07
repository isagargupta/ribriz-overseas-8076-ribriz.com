export default function DashboardLoading() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Header skeleton */}
      <div className="space-y-3">
        <div className="h-3 skeleton-shimmer rounded-lg w-20" />
        <div className="h-9 skeleton-shimmer rounded-xl w-96 max-w-full" />
        <div className="h-3 skeleton-shimmer rounded-lg w-32" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-premium">
            <div className="flex items-center justify-between mb-4">
              <div className="h-3 skeleton-shimmer rounded w-24" />
              <div className="w-8 h-8 skeleton-shimmer rounded-xl" />
            </div>
            <div className="h-8 skeleton-shimmer rounded-lg w-20" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="h-44 skeleton-shimmer rounded-[2rem]" />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-5 skeleton-shimmer rounded-lg w-48" />
              <div className="h-4 skeleton-shimmer rounded-lg w-20" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-premium p-5 flex items-center gap-5">
                  <div className="w-14 h-14 skeleton-shimmer rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 skeleton-shimmer rounded w-3/4" />
                    <div className="h-3 skeleton-shimmer rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="lg:col-span-4 space-y-6">
          <div className="h-52 skeleton-shimmer rounded-[2rem]" />
          <div className="h-64 skeleton-shimmer rounded-[2rem]" />
        </div>
      </div>
    </div>
  );
}
