import type { HomeIconProps } from "../types/homeComponent.types.ts";
import { ICONS } from "../constants/homeIcons.constants.ts";

export function HomeIcon({
  name,
  className = "",
  ...props
}: HomeIconProps) {
  const Asset = ICONS[name];
  return (
    <Asset
      className={`fw-icon w-[21px] h-[21px] shrink-0 ${className}`}
      aria-hidden="true"
      {...props}
    />
  );
}
