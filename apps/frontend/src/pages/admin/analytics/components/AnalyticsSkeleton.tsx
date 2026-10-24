import { Skeleton } from '../../../../components/ui/Skeleton';

export type TabType = 'overview' | 'retention' | 'promotions' | 'staff';

export function OverviewSkeleton() {
  return (
    <div className="space-y-8" data-testid="analytics-skeleton-overview">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-panel-surface p-6 rounded-2xl border border-panel-border shadow-sm"
          >
            <Skeleton className="h-4 w-28 mb-4 rounded" />
            <div className="flex items-baseline justify-between mb-4">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-36 rounded" />
          </div>
        ))}
      </div>

      {/* Chart & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        <div className="lg:col-span-2 bg-panel-surface p-8 rounded-2xl border border-panel-border shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <Skeleton className="h-6 w-44 rounded-lg mb-2" />
              <Skeleton className="h-3.5 w-64 rounded" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          </div>
          <div className="h-64 w-full bg-panel-soft/50 rounded-2xl p-6 flex flex-col justify-between border border-panel-border/30">
            <Skeleton className="h-3 w-12 rounded" />
            <div className="border-b border-dashed border-panel-border w-full" />
            <div className="border-b border-dashed border-panel-border w-full" />
            <div className="border-b border-dashed border-panel-border w-full" />
            <div className="flex justify-between gap-4 pt-2">
              {Array.from({ length: 7 }).map((_, idx) => (
                <Skeleton key={idx} className="h-3 w-8 rounded" />
              ))}
            </div>
          </div>
        </div>

        <div className="bg-panel-surface p-8 rounded-2xl border border-panel-border shadow-sm flex flex-col justify-between">
          <div>
            <Skeleton className="h-6 w-48 rounded-lg mb-2" />
            <Skeleton className="h-3.5 w-56 rounded mb-6" />
            <div className="space-y-4 mb-6">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-3 w-full rounded-full" />
              <Skeleton className="h-4 w-full rounded mt-4" />
              <Skeleton className="h-3 w-full rounded-full" />
            </div>
          </div>
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function RetentionSkeleton() {
  return (
    <div className="space-y-8" data-testid="analytics-skeleton-retention">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        <div className="bg-panel-surface p-8 rounded-2xl border border-panel-border shadow-sm">
          <Skeleton className="h-6 w-48 rounded-lg mb-2" />
          <Skeleton className="h-3.5 w-72 rounded mb-6" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-4 w-32 rounded" />
                </div>
                <Skeleton className="h-3 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-panel-surface p-8 rounded-2xl border border-panel-border shadow-sm">
          <Skeleton className="h-6 w-56 rounded-lg mb-2" />
          <Skeleton className="h-3.5 w-64 rounded mb-6" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
        </div>
      </div>

      <div className="bg-panel-surface p-8 rounded-2xl border border-panel-border shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div className="space-y-2">
            <Skeleton className="h-6 w-44 rounded-lg" />
            <Skeleton className="h-3.5 w-60 rounded" />
          </div>
          <Skeleton className="h-8 w-32 rounded-xl" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function PromotionsSkeleton() {
  return (
    <div className="space-y-8" data-testid="analytics-skeleton-promotions">
      <div className="bg-panel-surface p-8 rounded-2xl border border-panel-border shadow-sm">
        <Skeleton className="h-6 w-56 rounded-lg mb-2" />
        <Skeleton className="h-3.5 w-80 rounded mb-8" />
        <div className="space-y-4">
          <div className="grid grid-cols-6 gap-4 pb-3 border-b border-panel-border">
            <Skeleton className="h-3.5 w-20 rounded" />
            <Skeleton className="h-3.5 w-16 mx-auto rounded" />
            <Skeleton className="h-3.5 w-16 mx-auto rounded" />
            <Skeleton className="h-3.5 w-24 mx-auto rounded" />
            <Skeleton className="h-3.5 w-24 mx-auto rounded" />
            <Skeleton className="h-3.5 w-16 ml-auto rounded" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="grid grid-cols-6 gap-4 py-3 items-center border-b border-panel-border">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
              <Skeleton className="h-4 w-12 mx-auto rounded" />
              <Skeleton className="h-4 w-8 mx-auto rounded" />
              <Skeleton className="h-4 w-16 mx-auto rounded" />
              <Skeleton className="h-4 w-8 mx-auto rounded" />
              <Skeleton className="h-6 w-16 ml-auto rounded-full" />
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
      <div className="p-6 rounded-2xl bg-panel-soft/60 border border-panel-border flex items-center gap-4">
        <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-48 rounded" />
          <Skeleton className="h-3 w-72 rounded" />
        </div>
      </div>

      {/* Staff Activity Table Skeleton */}
      <div className="bg-panel-surface p-8 rounded-2xl border border-panel-border shadow-sm">
        <Skeleton className="h-6 w-48 rounded-lg mb-2" />
        <Skeleton className="h-3.5 w-80 rounded mb-8" />
        <div className="space-y-4">
          <div className="grid grid-cols-6 gap-4 pb-3 border-b border-panel-border">
            <Skeleton className="h-3.5 w-28 rounded" />
            <Skeleton className="h-3.5 w-12 mx-auto rounded" />
            <Skeleton className="h-3.5 w-20 mx-auto rounded" />
            <Skeleton className="h-3.5 w-20 mx-auto rounded" />
            <Skeleton className="h-3.5 w-24 mx-auto rounded" />
            <Skeleton className="h-3.5 w-20 ml-auto rounded" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="grid grid-cols-6 gap-4 py-3 items-center border-b border-panel-border">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-3 w-24 rounded" />
              </div>
              <Skeleton className="h-5 w-16 mx-auto rounded-full" />
              <Skeleton className="h-4 w-8 mx-auto rounded" />
              <Skeleton className="h-4 w-8 mx-auto rounded" />
              <Skeleton className="h-4 w-12 mx-auto rounded" />
              <Skeleton className="h-6 w-16 ml-auto rounded-full" />
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
