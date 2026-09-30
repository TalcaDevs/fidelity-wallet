export interface PassData {
  passId: string;
  serialNumber: string;
  passToken: string;
  programId: string;
  merchantName: string;
  customerLabel: string;
  activeStamps: number;
  targetStamps: number;
  rewardName: string;
  nextExpiryAt?: Date | null;
  backgroundColor?: string;
  foregroundColor?: string;
  labelColor?: string;
}
