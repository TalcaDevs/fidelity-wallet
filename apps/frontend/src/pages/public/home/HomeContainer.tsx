import type { HTMLAttributes } from "react";

type ContainerProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "section" | "footer";
};

export function HomeContainer({
  as: Element = "div",
  className = "",
  ...props
}: ContainerProps) {
  return (
    <Element
      className={`fw-container mx-auto [width:min(1184px,_calc(100%_-_96px))] ${className}`}
      {...props}
    />
  );
}
