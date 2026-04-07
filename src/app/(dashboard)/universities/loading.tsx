export default function UniversitiesLoading() {
  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 bg-surface-container-high rounded-xl w-72" />
        <div className="h-4 bg-surface-container-high rounded-lg w-48" />
      </div>
      <div className="flex gap-4">
        <div className="h-10 bg-surface-container-high rounded-2xl w-80" />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-surface-container-high rounded-xl w-20" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/15 h-48" />
        ))}
      </div>
    </div>
  );
}
