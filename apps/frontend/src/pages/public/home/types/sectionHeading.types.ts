import type { ReactNode } from "react";
export type HeadingProps = {
  id: string;
  label: string;
  title: ReactNode;
  children: ReactNode;
  reveal?: boolean;
  className?: string;
};
