import type { BRANCHES } from "../constants/locations.constants";
export type Branch = (typeof BRANCHES)[number];
export interface BranchSelectionProps {
  branchIndex: number;
  onSelect: (index: number) => void;
}
export interface BranchDetailProps {
  branch: Branch;
}
