export type HugStackParamList = {
  /** The "Need a hug?" compose screen. */
  NeedAHug: undefined;
  /**
   * Confirmation / active-session screen after a hug is sent.
   * `deliveryMs` is the measured server round-trip for the send request.
   */
  HugSent: { hugId: string; deliveryMs: number };
  /**
   * The synced breathing view both partners can open on the same hug.
   *
   * `anchorIso` is the hug's `createdAt` — the shared clock origin the cadence
   * is derived from, so both devices land on the same phase. It's optional
   * because the screen re-fetches the hug anyway; passing it just avoids a
   * first-frame guess. `partnerName` / `isAcknowledged` are seeds for the same
   * reason.
   */
  BreatheTogether: {
    hugId: string;
    anchorIso?: string;
    partnerName?: string;
    isAcknowledged?: boolean;
  };
  /** Full history of hugs shared in the relationship. */
  HugsHistory: undefined;
};
