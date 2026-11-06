export class CampaignNotFoundError extends Error {
  constructor(message = "Campaign not found") {
    super(message);
    this.name = "CampaignNotFoundError";
  }
}

// ---- launch refusals (`launchCampaign` in campaignLaunch.service.ts) ----------
//
// Each surface that launches a campaign (the dashboard's send handler, the partner
// API) maps these to its own wire shape. The messages here are the dashboard's,
// because that is the surface that shows them to a person verbatim.

/** A fan-out or dequeue is still running and has not gone stale. */
export class CampaignBusyError extends Error {
  constructor(readonly campaignStatus: string) {
    super(`Campaign ${campaignStatus} is in progress, so no action can be performed at this time.`);
    this.name = "CampaignBusyError";
  }
}

/** A caller asked for a status only the platform may set (PAUSED). */
export class CampaignStatusNotAllowedError extends Error {
  constructor(readonly requested: string) {
    super("A campaign cannot be set to PAUSED directly. Stop it instead.");
    this.name = "CampaignStatusNotAllowedError";
  }
}

/** A drip status change that did not say which status. */
export class CampaignStatusRequiredError extends Error {
  constructor() {
    super("status is required to update a DRIP campaign");
    this.name = "CampaignStatusRequiredError";
  }
}

/** A drip has no re-send: its stages go out on schedule. */
export class DripResendUnsupportedError extends Error {
  constructor() {
    super(
      "A drip campaign cannot re-send to specific recipients. Its stages are sent by schedule.",
    );
    this.name = "DripResendUnsupportedError";
  }
}

export type CampaignIncompleteReason = "no_template" | "no_drip_stages";

/** Saved as a half-finished draft, and launched before it was finished. */
export class CampaignIncompleteError extends Error {
  constructor(readonly reason: CampaignIncompleteReason) {
    super(
      reason === "no_drip_stages"
        ? "Add at least one drip stage before launching this campaign."
        : "Choose a template before launching this campaign.",
    );
    this.name = "CampaignIncompleteError";
  }
}

/** Nobody to send to: no participant in the statuses, or the named ones are gone. */
export class CampaignNoRecipientsError extends Error {
  constructor(readonly scoped: boolean) {
    super(
      scoped
        ? `Those recipients are no longer on this campaign.`
        : `No participants with the specified statuses to send the campaign to.`,
    );
    this.name = "CampaignNoRecipientsError";
  }
}

/** Nothing at all could go out (a send), or a paused drip would only pause again. */
export class CampaignCreditsExhaustedError extends Error {
  constructor(readonly resuming: boolean) {
    super(
      resuming
        ? "Your campaign credits are still used up, so this campaign cannot resume yet. " +
            "Upgrade or add a credit pack to keep sending."
        : "You have used all your campaign credits this month, so this campaign cannot be " +
            "sent yet. Upgrade or add a credit pack to keep sending.",
    );
    this.name = "CampaignCreditsExhaustedError";
  }
}

/**
 * The send row was opened but the fan-out job could not be queued. By the time this is
 * thrown the send is closed as failed and the campaign marked FAILED.
 */
export class CampaignEnqueueFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CampaignEnqueueFailedError";
  }
}

/** A stop (status INACTIVE) whose dequeue request was not accepted. */
export class CampaignDequeueFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CampaignDequeueFailedError";
  }
}
