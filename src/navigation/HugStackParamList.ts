export type HugStackParamList = {
  /** The "Need a hug?" compose screen. */
  NeedAHug: undefined;
  /**
   * Confirmation / active-session screen after a hug is sent.
   * `deliveryMs` is the measured server round-trip for the send request.
   */
  HugSent: { hugId: string; deliveryMs: number };
  /** Full history of hugs shared in the relationship. */
  HugsHistory: undefined;
};
