import {
  STARTING_STAMPS,
  REWARD_STAMPS,
} from "../constants/loyaltyCard.constants";
import type {
  StampSequenceState,
  StampSequenceAction,
} from "../types/stampSequence.types";
export function createStampSequence(): StampSequenceState {
  return { stamps: STARTING_STAMPS, burst: null, sequence: 0 };
}
export function stampSequenceReducer(
  state: StampSequenceState,
  action: StampSequenceAction,
): StampSequenceState {
  if (action.type === "reset")
    return { ...createStampSequence(), sequence: state.sequence };
  if (action.type === "clearBurst")
    return state.burst ? { ...state, burst: null } : state;
  if (state.stamps >= REWARD_STAMPS) return state;
  const stamps = state.stamps + 1;
  const sequence = state.sequence + 1;
  return {
    stamps,
    sequence,
    burst: action.motionAllowed ? { stamp: stamps, id: sequence } : null,
  };
}
