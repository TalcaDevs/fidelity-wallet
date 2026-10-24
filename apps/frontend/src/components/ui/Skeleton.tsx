import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`bg-panel-soft motion-safe:animate-pulse rounded-xl ${className}`}
      data-testid="skeleton"
      {...props}
    />
  );
}

export interface SkeletonCardProps {
  className?: string;
  lines?: number;
}

export function SkeletonCard({ className = '', lines = 2 }: SkeletonCardProps) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-2xl border border-panel-border/60 bg-panel-soft/30 p-4 space-y-3 motion-safe:animate-pulse ${className}`}
      data-testid="skeleton-card"
    >
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-20 rounded-md" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className={`h-4 rounded-md ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
          />
        ))}
      </div>
      <div className="pt-2.5 border-t border-panel-border/40 flex justify-between items-center">
        <Skeleton className="h-4 w-24 rounded-md" />
        <Skeleton className="h-4 w-24 rounded-md" />
      </div>
    </div>
  );
}

export interface SkeletonListProps {
  count?: number;
  className?: string;
}

export function SkeletonList({ count = 3, className = 'space-y-3' }: SkeletonListProps) {
  return (
    <div className={className} data-testid="skeleton-list" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export interface SkeletonTableProps {
  rows?: number;
  cols?: number;
  className?: string;
}

export function SkeletonTable({ rows = 4, cols = 4, className = 'w-full space-y-3' }: SkeletonTableProps) {
  return (
    <div className={className} data-testid="skeleton-table" aria-hidden="true">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 items-center p-3 rounded-xl border border-panel-border/40 bg-panel-soft/20">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className={`h-4 rounded-md ${c === 0 ? 'w-1/3' : 'flex-1'}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

Skeleton.Card = SkeletonCard;
Skeleton.List = SkeletonList;
Skeleton.Table = SkeletonTable;
