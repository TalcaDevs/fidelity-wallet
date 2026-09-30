export type TabType = 'overview' | 'retention' | 'promotions' | 'staff';

export function OverviewSkeleton() {
  return (
    <div className="space-y-8" data-testid="analytics-skeleton-overview">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm animate-pulse"
          >
            <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
            <div className="flex items-baseline justify-between mb-4">
              <div className="h-9 w-24 bg-slate-200 dark:bg-slate-700 rounded-xl" />
              <div className="h-6 w-14 bg-slate-100 dark:bg-slate-700/60 rounded-full" />
            </div>
            <div className="h-3.5 w-36 bg-slate-100 dark:bg-slate-700/50 rounded" />
          </div>
        ))}
      </div>

      {/* Chart & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 shadow-sm animate-pulse">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="h-6 w-44 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2" />
              <div className="h-3.5 w-64 bg-slate-100 dark:bg-slate-700/60 rounded" />
            </div>
            <div className="flex items-center gap-4">
              <div className="h-5 w-24 bg-slate-100 dark:bg-slate-700/60 rounded-full" />
              <div className="h-5 w-24 bg-slate-100 dark:bg-slate-700/60 rounded-full" />
            </div>
          </div>
          <div className="h-64 w-full bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl p-6 flex flex-col justify-between">
            <div className="h-3 w-12 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="border-b border-dashed border-slate-200 dark:border-slate-700/60 w-full" />
            <div className="border-b border-dashed border-slate-200 dark:border-slate-700/60 w-full" />
            <div className="border-b border-dashed border-slate-200 dark:border-slate-700/60 w-full" />
            <div className="flex justify-between gap-4 pt-2">
              {Array.from({ length: 7 }).map((_, idx) => (
                <div key={idx} className="h-3 w-8 bg-slate-200 dark:bg-slate-700 rounded" />
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 shadow-sm animate-pulse flex flex-col justify-between">
          <div>
            <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2" />
            <div className="h-3.5 w-56 bg-slate-100 dark:bg-slate-700/60 rounded mb-6" />
            <div className="space-y-4 mb-6">
              <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-700/50 rounded-full" />
              <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded mt-4" />
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-700/50 rounded-full" />
            </div>
          </div>
          <div className="h-16 w-full bg-slate-100 dark:bg-slate-700/50 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function RetentionSkeleton() {
  return (
    <div className="space-y-8" data-testid="analytics-skeleton-retention">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 shadow-sm animate-pulse">
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2" />
          <div className="h-3.5 w-72 bg-slate-100 dark:bg-slate-700/60 rounded mb-6" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-700/50 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 shadow-sm animate-pulse">
          <div className="h-6 w-56 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2" />
          <div className="h-3.5 w-64 bg-slate-100 dark:bg-slate-700/60 rounded mb-6" />
          <div className="space-y-3">
            <div className="h-8 w-full bg-slate-100 dark:bg-slate-700/50 rounded-lg" />
            <div className="h-8 w-full bg-slate-100 dark:bg-slate-700/50 rounded-lg" />
            <div className="h-8 w-full bg-slate-100 dark:bg-slate-700/50 rounded-lg" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 shadow-sm animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div className="space-y-2">
            <div className="h-6 w-44 bg-slate-200 dark:bg-slate-700 rounded-lg" />
            <div className="h-3.5 w-60 bg-slate-100 dark:bg-slate-700/60 rounded" />
          </div>
          <div className="h-8 w-32 bg-slate-100 dark:bg-slate-700 rounded-xl" />
        </div>
        <div className="space-y-3">
          <div className="h-10 w-full bg-slate-100 dark:bg-slate-700/50 rounded-xl" />
          <div className="h-10 w-full bg-slate-100 dark:bg-slate-700/50 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function PromotionsSkeleton() {
  return (
    <div className="space-y-8" data-testid="analytics-skeleton-promotions">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 shadow-sm animate-pulse">
        <div className="h-6 w-56 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2" />
        <div className="h-3.5 w-80 bg-slate-100 dark:bg-slate-700/60 rounded mb-8" />
        <div className="space-y-4">
          <div className="grid grid-cols-6 gap-4 pb-3 border-b border-slate-200 dark:border-slate-700">
            <div className="h-3.5 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3.5 w-16 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3.5 w-16 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3.5 w-24 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3.5 w-24 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3.5 w-16 ml-auto bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="grid grid-cols-6 gap-4 py-3 items-center border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-2">
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-3 w-20 bg-slate-100 dark:bg-slate-700/60 rounded" />
              </div>
              <div className="h-4 w-12 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-4 w-8 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-4 w-16 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-4 w-8 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-6 w-16 ml-auto bg-slate-100 dark:bg-slate-700/60 rounded-full" />
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
      <div className="p-6 rounded-[2rem] bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 animate-pulse flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-700" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-3 w-72 bg-slate-200/60 dark:bg-slate-700/60 rounded" />
        </div>
      </div>

      {/* Staff Activity Table Skeleton */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-700/60 shadow-sm animate-pulse">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2" />
        <div className="h-3.5 w-80 bg-slate-100 dark:bg-slate-700/60 rounded mb-8" />
        <div className="space-y-4">
          <div className="grid grid-cols-6 gap-4 pb-3 border-b border-slate-200 dark:border-slate-700">
            <div className="h-3.5 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3.5 w-12 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3.5 w-20 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3.5 w-20 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3.5 w-24 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3.5 w-20 ml-auto bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="grid grid-cols-6 gap-4 py-3 items-center border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-2">
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-3 w-24 bg-slate-100 dark:bg-slate-700/60 rounded" />
              </div>
              <div className="h-5 w-16 mx-auto bg-slate-100 dark:bg-slate-700/60 rounded-full" />
              <div className="h-4 w-8 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-4 w-8 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-4 w-12 mx-auto bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-6 w-16 ml-auto bg-slate-100 dark:bg-slate-700/60 rounded-full" />
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
