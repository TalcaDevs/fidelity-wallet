import type { ScanResult, ScanValidation as Validation } from '../../services/scanService';

export type ScanStatus =
  | 'camera'
  | 'manual'
  | 'loading'
  | 'validation'
  | 'success'
  | 'alreadyScanned'
  | 'reward'
  | 'error'
  | 'redeemSuccess';

export type RewardSource = 'validation' | 'stamped';

export interface ScanState {
  isStarted: boolean;
  status: ScanStatus;
  result: ScanResult | null;
  validation: Validation | null;
  rewardFrom: RewardSource;
  isSessionExpired: boolean;
}

export type ScanAction =
  | { type: 'START_CAMERA' }
  | { type: 'SWITCH_TO_MANUAL' }
  | { type: 'RESET_SCANNER' }
  | { type: 'START_LOOKUP' }
  | { type: 'LOOKUP_SUCCESS'; validation: Validation }
  | { type: 'START_ACTION' }
  | { type: 'ACTION_SUCCESS'; result: ScanResult }
  | { type: 'ACTION_ALREADY_SCANNED'; result: ScanResult }
  | { type: 'ACTION_REDEEM_SUCCESS'; result: ScanResult }
  | { type: 'OPEN_REWARD'; from: RewardSource }
  | { type: 'LEAVE_REWARD' }
  | { type: 'FAILURE'; result?: ScanResult; isSessionExpired?: boolean };

export const rewardFromValidation = (v: Validation): ScanResult => ({
  ok: true,
  passId: v.passId,
  customerLabel: v.customerLabel,
  stampsCount: v.stampsCount,
  pointsCount: v.pointsCount,
  rewardCurrency: v.rewardCurrency,
  stampsEnabled: v.stampsEnabled,
  pointsEnabled: v.pointsEnabled,
  targetStamps: v.targetStamps,
  rewardUnlocked: v.rewardUnlocked,
  rewardName: v.rewardName,
  availablePromotions: v.availablePromotions,
  nextExpiryAt: v.nextExpiryAt,
});

export const initialScanState: ScanState = {
  isStarted: false,
  status: 'camera',
  result: null,
  validation: null,
  rewardFrom: 'stamped',
  isSessionExpired: false,
};

export function scanReducer(state: ScanState, action: ScanAction): ScanState {
  switch (action.type) {
    case 'START_CAMERA':
      return { ...state, isStarted: true, status: 'camera' };

    case 'SWITCH_TO_MANUAL':
      return { ...state, status: 'manual' };

    case 'RESET_SCANNER':
      return { ...state, status: 'camera', result: null, validation: null };

    case 'START_LOOKUP':
      return { ...state, status: 'loading', result: null };

    case 'LOOKUP_SUCCESS':
      return { ...state, status: 'validation', validation: action.validation };

    case 'START_ACTION':
      return { ...state, status: 'loading' };

    case 'ACTION_SUCCESS':
      return { ...state, status: 'success', result: action.result };

    case 'ACTION_ALREADY_SCANNED':
      return { ...state, status: 'alreadyScanned', result: action.result };

    case 'ACTION_REDEEM_SUCCESS':
      return { ...state, status: 'redeemSuccess', result: action.result };

    case 'OPEN_REWARD':
      return {
        ...state,
        status: 'reward',
        rewardFrom: action.from,
        result:
          action.from === 'validation' && state.validation
            ? rewardFromValidation(state.validation)
            : state.result,
      };

    case 'LEAVE_REWARD':
      if (state.rewardFrom === 'validation' && state.validation) {
        return { ...state, status: 'validation' };
      }
      return { ...state, status: 'camera', result: null, validation: null };

    case 'FAILURE':
      if (action.isSessionExpired) {
        return {
          ...state,
          isSessionExpired: true,
          result: action.result ?? state.result,
        };
      }
      return { ...state, status: 'error', result: action.result ?? null };

    default:
      return state;
  }
}
