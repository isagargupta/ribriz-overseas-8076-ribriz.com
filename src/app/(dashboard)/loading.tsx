export default function DashboardLoading() {
  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 bg-surface-container-high rounded-xl w-96 max-w-full" />
        <div className="h-4 bg-surface-container-high rounded-lg w-48" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/15">
            <div className="h-3 bg-surface-container-high rounded w-24 mb-4" />
            <div className="h-8 bg-surface-container-high rounded w-16" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="h-40 bg-surface-container-high rounded-[2rem]" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-surface-container-lowest rounded-3xl border border-outline-variant/15" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-4 space-y-8">
          <div className="h-48 bg-surface-container-low rounded-[2rem]" />
          <div className="h-64 bg-surface-container-lowest rounded-[2rem] border border-outline-variant/15" />
        </div>
      </div>
    </div>
  );
}
