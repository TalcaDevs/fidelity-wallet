import type { ReactNode, Ref } from 'react';
import { PanelTitle } from '../admin/PanelTitle';

export interface PageHeaderProps {
  title: ReactNode;
  animated?: boolean;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
  headingRef?: Ref<HTMLHeadingElement>;
}

export function PageHeader({
  title,
  animated = true,
  description,
  actions,
  className = '',
  children,
  headingRef,
}: PageHeaderProps) {
  const renderedTitle =
    animated && typeof title === 'string' ? <PanelTitle text={title} /> : title;

  return (
    <header
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 ${className}`.trim()}
    >
      <div className="min-w-0">
        <h1
          ref={headingRef}
          className="text-2xl sm:text-3xl font-extrabold tracking-tight text-panel-text break-words"
        >
          {renderedTitle}
        </h1>
        {description && (
          <p className="text-panel-muted mt-1.5 sm:mt-2 text-sm sm:text-base">
            {description}
          </p>
        )}
        {children}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0 self-start sm:self-auto">
          {actions}
        </div>
      )}
    </header>
  );
}
