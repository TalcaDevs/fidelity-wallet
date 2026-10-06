import { describe, expect, it } from "vitest";
import { createStampSequence, stampSequenceReducer } from "./stampSequence";
describe("stamp sequence", () => {
  it("keeps stamps and bursts atomic across rapid updates and reset", () => {
    let state = createStampSequence();
    for (let i = 0; i < 20; i++)
      state = stampSequenceReducer(state, { type: "add", motionAllowed: true });
    expect(state.stamps).toBe(10);
    expect(state.burst).toEqual({ stamp: 10, id: 8 });
    state = stampSequenceReducer(state, { type: "reset" });
    state = stampSequenceReducer(state, { type: "add", motionAllowed: true });
    expect(state.burst).toEqual({ stamp: 3, id: 9 });
  });
  it("adds manual stamps without particles when motion is disabled", () => {
    const state = stampSequenceReducer(createStampSequence(), {
      type: "add",
      motionAllowed: false,
    });
    expect(state.stamps).toBe(3);
    expect(state.burst).toBeNull();
  });
});
