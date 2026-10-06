export type TabType = 'overview' | 'retention' | 'promotions' | 'staff';

export function OverviewSkeleton() {
  return (
    <div className="space-y-8" data-testid="analytics-skeleton-overview">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-panel-surface p-6 rounded-2xl border border-panel-border shadow-sm animate-pulse"
          >
            <div className="h-4 w-28 bg-panel-soft rounded mb-4" />
            <div className="flex items-baseline justify-between mb-4">
              <div className="h-9 w-24 bg-panel-soft rounded-xl" />
              <div className="h-6 w-14 bg-panel-soft rounded-full" />
            </div>
            <div className="h-3.5 w-36 bg-panel-soft rounded" />
          </div>
        ))}
      </div>

      {/* Chart & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        <div className="lg:col-span-2 bg-panel-surface p-8 rounded-2xl border border-panel-border shadow-sm animate-pulse">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="h-6 w-44 bg-panel-soft rounded-lg mb-2" />
              <div className="h-3.5 w-64 bg-panel-soft rounded" />
            </div>
            <div className="flex items-center gap-4">
              <div className="h-5 w-24 bg-panel-soft rounded-full" />
              <div className="h-5 w-24 bg-panel-soft rounded-full" />
            </div>
          </div>
          <div className="h-64 w-full bg-panel-soft rounded-2xl p-6 flex flex-col justify-between">
            <div className="h-3 w-12 bg-panel-soft rounded" />
            <div className="border-b border-dashed border-panel-border w-full" />
            <div className="border-b border-dashed border-panel-border w-full" />
            <div className="border-b border-dashed border-panel-border w-full" />
            <div className="flex justify-between gap-4 pt-2">
              {Array.from({ length: 7 }).map((_, idx) => (
                <div key={idx} className="h-3 w-8 bg-panel-soft rounded" />
              ))}
            </div>
          </div>
        </div>

        <div className="bg-panel-surface p-8 rounded-2xl border border-panel-border shadow-sm animate-pulse flex flex-col justify-between">
          <div>
            <div className="h-6 w-48 bg-panel-soft rounded-lg mb-2" />
            <div className="h-3.5 w-56 bg-panel-soft rounded mb-6" />
            <div className="space-y-4 mb-6">
              <div className="h-4 w-full bg-panel-soft rounded" />
              <div className="h-3 w-full bg-panel-soft rounded-full" />
              <div className="h-4 w-full bg-panel-soft rounded mt-4" />
              <div className="h-3 w-full bg-panel-soft rounded-full" />
            </div>
          </div>
          <div className="h-16 w-full bg-panel-soft rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function RetentionSkeleton() {
  return (
    <div className="space-y-8" data-testid="analytics-skeleton-retention">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        <div className="bg-panel-surface p-8 rounded-2xl border border-panel-border shadow-sm animate-pulse">
          <div className="h-6 w-48 bg-panel-soft rounded-lg mb-2" />
          <div className="h-3.5 w-72 bg-panel-soft rounded mb-6" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 w-24 bg-panel-soft rounded" />
                  <div className="h-4 w-32 bg-panel-soft rounded" />
                </div>
                <div className="h-3 w-full bg-panel-soft rounded-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-panel-surface p-8 rounded-2xl border border-panel-border shadow-sm animate-pulse">
          <div className="h-6 w-56 bg-panel-soft rounded-lg mb-2" />
          <div className="h-3.5 w-64 bg-panel-soft rounded mb-6" />
          <div className="space-y-3">
            <div className="h-8 w-full bg-panel-soft rounded-lg" />
            <div className="h-8 w-full bg-panel-soft rounded-lg" />
            <div className="h-8 w-full bg-panel-soft rounded-lg" />
          </div>
        </div>
      </div>

      <div className="bg-panel-surface p-8 rounded-2xl border border-panel-border shadow-sm animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div className="space-y-2">
            <div className="h-6 w-44 bg-panel-soft rounded-lg" />
            <div className="h-3.5 w-60 bg-panel-soft rounded" />
          </div>
          <div className="h-8 w-32 bg-panel-soft rounded-xl" />
        </div>
        <div className="space-y-3">
          <div className="h-10 w-full bg-panel-soft rounded-xl" />
          <div className="h-10 w-full bg-panel-soft rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function PromotionsSkeleton() {
  return (
    <div className="space-y-8" data-testid="analytics-skeleton-promotions">
      <div className="bg-panel-surface p-8 rounded-2xl border border-panel-border shadow-sm animate-pulse">
        <div className="h-6 w-56 bg-panel-soft rounded-lg mb-2" />
        <div className="h-3.5 w-80 bg-panel-soft rounded mb-8" />
        <div className="space-y-4">
          <div className="grid grid-cols-6 gap-4 pb-3 border-b border-panel-border">
            <div className="h-3.5 w-20 bg-panel-soft rounded" />
            <div className="h-3.5 w-16 mx-auto bg-panel-soft rounded" />
            <div className="h-3.5 w-16 mx-auto bg-panel-soft rounded" />
            <div className="h-3.5 w-24 mx-auto bg-panel-soft rounded" />
            <div className="h-3.5 w-24 mx-auto bg-panel-soft rounded" />
            <div className="h-3.5 w-16 ml-auto bg-panel-soft rounded" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="grid grid-cols-6 gap-4 py-3 items-center border-b border-panel-border">
              <div className="space-y-2">
                <div className="h-4 w-32 bg-panel-soft rounded" />
                <div className="h-3 w-20 bg-panel-soft rounded" />
              </div>
              <div className="h-4 w-12 mx-auto bg-panel-soft rounded" />
              <div className="h-4 w-8 mx-auto bg-panel-soft rounded" />
              <div className="h-4 w-16 mx-auto bg-panel-soft rounded" />
              <div className="h-4 w-8 mx-auto bg-panel-soft rounded" />
              <div className="h-6 w-16 ml-auto bg-panel-soft rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StaffSkeleton() {
  return (
    <div className="space-y-8" data-testid="analytics-skeleton-staff">
      {/* Alert Banner Skeleton */}
      <div className="p-6 rounded-2xl bg-panel-soft border border-panel-border animate-pulse flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-panel-soft" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-48 bg-panel-soft rounded" />
          <div className="h-3 w-72 bg-panel-soft rounded" />
        </div>
      </div>

      {/* Staff Activity Table Skeleton */}
      <div className="bg-panel-surface p-8 rounded-2xl border border-panel-border shadow-sm animate-pulse">
        <div className="h-6 w-48 bg-panel-soft rounded-lg mb-2" />
        <div className="h-3.5 w-80 bg-panel-soft rounded mb-8" />
        <div className="space-y-4">
          <div className="grid grid-cols-6 gap-4 pb-3 border-b border-panel-border">
            <div className="h-3.5 w-28 bg-panel-soft rounded" />
            <div className="h-3.5 w-12 mx-auto bg-panel-soft rounded" />
            <div className="h-3.5 w-20 mx-auto bg-panel-soft rounded" />
            <div className="h-3.5 w-20 mx-auto bg-panel-soft rounded" />
            <div className="h-3.5 w-24 mx-auto bg-panel-soft rounded" />
            <div className="h-3.5 w-20 ml-auto bg-panel-soft rounded" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="grid grid-cols-6 gap-4 py-3 items-center border-b border-panel-border">
              <div className="space-y-2">
                <div className="h-4 w-32 bg-panel-soft rounded" />
                <div className="h-3 w-24 bg-panel-soft rounded" />
              </div>
              <div className="h-5 w-16 mx-auto bg-panel-soft rounded-full" />
              <div className="h-4 w-8 mx-auto bg-panel-soft rounded" />
              <div className="h-4 w-8 mx-auto bg-panel-soft rounded" />
              <div className="h-4 w-12 mx-auto bg-panel-soft rounded" />
              <div className="h-6 w-16 ml-auto bg-panel-soft rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AnalyticsSkeleton({ activeTab }: { activeTab: TabType }) {
  return (
    <div
      data-testid="analytics-skeleton"
      aria-busy="true"
      aria-label="Cargando datos de analítica"
      className="transition-opacity duration-200"
    >
      {activeTab === 'overview' && <OverviewSkeleton />}
      {activeTab === 'retention' && <RetentionSkeleton />}
      {activeTab === 'promotions' && <PromotionsSkeleton />}
      {activeTab === 'staff' && <StaffSkeleton />}
    </div>
  );
}
