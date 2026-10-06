import type { ContainerProps } from "../types/homeContainer.types.ts";

export function HomeContainer({
  as: Element = "div",
  className = "",
  ...props
}: ContainerProps) {
  return (
    <Element
      className={`
        fw-container mx-auto w-[min(1184px,_calc(100%_-_96px))]
        min-[1500px]:w-[min(1250px,_calc(100%_-_120px))] max-[1100.001px]:w-[calc(100%_-_64px)]
        max-[700.001px]:w-[calc(100%_-_40px)] max-[390.001px]:w-[calc(100%_-_32px)]
      ${className}

      `}
      {...props}
    />
  );
}
