import type { HTMLAttributes } from "react";
export type ContainerProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "section" | "footer";
};
