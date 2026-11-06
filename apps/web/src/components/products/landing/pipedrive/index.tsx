import CrmIntegrationPage from "../crm/CrmIntegrationPage";
import { PIPEDRIVE_CONTENT } from "./content";

/** `/integrations/pipedrive`: the shared CRM page (`../crm/CrmIntegrationPage`) with Pipedrive's copy. */
export default function PipedriveIntegrationPage() {
  return <CrmIntegrationPage content={PIPEDRIVE_CONTENT} />;
}
