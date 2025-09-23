import { IntegratedApps } from "@/types/enums";

export function getIntegrationDisplayName(name) {
  switch (name) {
    case IntegratedApps.googlesheet:
      return "Google Sheet";
    case IntegratedApps.shopify:
      return "Shopify";
    case IntegratedApps.amelia:
      return "Amelia";
    case IntegratedApps.waPayment:
      return "Whatsapp Payment";
    case IntegratedApps.petpooja:
      return "Petpooja";
    case IntegratedApps.zapier:
      return "Zapier";
    default:
      return "Not defined";
  }
}
