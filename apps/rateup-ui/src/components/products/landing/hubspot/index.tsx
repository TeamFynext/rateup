import CrmIntegrationPage from "../crm/CrmIntegrationPage";
import { HUBSPOT_CONTENT } from "./content";

/** `/integrations/hubspot`: the shared CRM page (`../crm/CrmIntegrationPage`) with HubSpot's copy. */
export default function HubSpotIntegrationPage() {
  return <CrmIntegrationPage content={HUBSPOT_CONTENT} />;
}
