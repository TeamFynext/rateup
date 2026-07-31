// Extracted verbatim from `Zoho.tsx`. Behaviour is unchanged.

export enum ZohoTriggers {
  CONTACT_CREATE = "contact_created",
  CONTACT_UPDATE = "contact_updated",
  CONTACT_DELETE = "contact_deleted",
  CONTACT_WEBHOOK = "contact_webhook",
  LEAD_WEBHOOK = "lead_webhook",
  LEAD_UPDATE = "lead_updated",
  LEAD_CREATE = "lead_created",
  BIGIN_CONTACT_CREATE = "bigin_contact_created",
  BIGIN_CONTACT_UPDATE = "bigin_contact_updated",
  BIGIN_CONTACT_DELETE = "bigin_contact_deleted",
  BIGIN_DEAL_CREATE = "bigin_deal_created",
  BIGIN_CONTACT_WEBHOOK = "bigin_contact_webhook",
  BIGIN_DEAL_WEBHOOK = "bigin_deal_webhook",
}

export function getTriggerLabel(triggerKey: ZohoTriggers) {
  switch (triggerKey) {
    case ZohoTriggers.CONTACT_CREATE:
      return "Create Contact";
    case ZohoTriggers.CONTACT_UPDATE:
      return "Update Contact";
    case ZohoTriggers.CONTACT_DELETE:
      return "Delete Contact";
    case ZohoTriggers.LEAD_UPDATE:
      return "Update Lead";
    case ZohoTriggers.LEAD_CREATE:
      return "Create Lead";
    case ZohoTriggers.BIGIN_CONTACT_CREATE:
      return "Create Bigin Contact";
    case ZohoTriggers.BIGIN_CONTACT_UPDATE:
      return "Update Bigin Contact";
    case ZohoTriggers.BIGIN_CONTACT_DELETE:
      return "Delete Bigin Contact";
    case ZohoTriggers.BIGIN_DEAL_CREATE:
      return "Create Bigin Deal";
    case ZohoTriggers.BIGIN_CONTACT_WEBHOOK:
      return "Bigin Contact Webhook";
    case ZohoTriggers.BIGIN_DEAL_WEBHOOK:
      return "Bigin Deal Webhook";
    case ZohoTriggers.LEAD_WEBHOOK:
      return "CRM Lead Webhook";
    case ZohoTriggers.CONTACT_WEBHOOK:
      return "CRM Contact Webhook";
    default:
      return "Not Supported";
  }
}

export function getTriggerDescription(triggerKey: ZohoTriggers) {
  switch (triggerKey) {
    case ZohoTriggers.CONTACT_CREATE:
      return "Automatically create contacts in Zoho CRM when new contacts are added.";
    case ZohoTriggers.CONTACT_UPDATE:
      return "Sync contact changes like name, email, and phone to Zoho CRM.";
    case ZohoTriggers.CONTACT_DELETE:
      return "Delete Zoho CRM contacts when contacts are removed in Rateup.";
    case ZohoTriggers.LEAD_CREATE:
      return "Create Zoho CRM leads from newly created Rateup contacts.";
    case ZohoTriggers.LEAD_UPDATE:
      return "Update Zoho lead status when lifecycle stages change.";
    case ZohoTriggers.BIGIN_CONTACT_CREATE:
      return "Automatically create contacts in Zoho Bigin.";
    case ZohoTriggers.BIGIN_CONTACT_UPDATE:
      return "Sync contact updates to Zoho Bigin.";
    case ZohoTriggers.BIGIN_CONTACT_DELETE:
      return "Delete contacts from Zoho Bigin when removed in Rateup.";
    case ZohoTriggers.BIGIN_DEAL_CREATE:
      return "Automatically create deals using the selected pipeline and stage.";
    case ZohoTriggers.LEAD_WEBHOOK:
      return "Receive Zoho CRM lead updates and sync lifecycle changes into Rateup.";
    case ZohoTriggers.BIGIN_CONTACT_WEBHOOK:
      return "Receive Zoho Bigin contact updates and sync them into Rateup.";
    case ZohoTriggers.BIGIN_DEAL_WEBHOOK:
      return "Receive Bigin deal updates and update Rateup lifecycle stages.";
    case ZohoTriggers.CONTACT_WEBHOOK:
      return "Receive Zoho CRM contact updates and sync them into Rateup.";
    default:
      return "Not Supported";
  }
}
