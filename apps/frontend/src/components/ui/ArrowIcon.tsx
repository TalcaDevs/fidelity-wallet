import type { ComponentProps } from 'react';
import PlanArrowSvg from '../../assets/home/plan-arrow.svg?react';

export type ArrowDirection = 'right' | 'left' | 'up' | 'down';

export interface ArrowIconProps extends ComponentProps<typeof PlanArrowSvg> {
  direction?: ArrowDirection;
}

const DIRECTION_CLASSES: Record<ArrowDirection, string> = {
  right: '',
  left: 'rotate-180',
  up: '-rotate-90',
  down: 'rotate-90',
};

export function ArrowIcon({
  direction = 'right',
  className = 'w-4 h-4',
  'aria-hidden': ariaHidden = true,
  ...props
}: ArrowIconProps) {
  const rotation = DIRECTION_CLASSES[direction];
  const combinedClassName = `inline-block shrink-0 transition-transform ${rotation} ${className}`.trim();

  return (
    <PlanArrowSvg
      aria-hidden={ariaHidden}
      className={combinedClassName}
      {...props}
    />
  );
}
