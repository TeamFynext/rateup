export class CampaignNotFoundError extends Error {
  constructor(message = "Campaign not found") {
    super(message);
    this.name = "CampaignNotFoundError";
  }
}
