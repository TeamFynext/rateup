import { getValidZohoAccessToken, loadZohoIntegration } from "./zoho.auth.js";
import {
  getZohoFieldMetadata,
  getZohoLayoutsMetadata,
  getZohoRecords,
  type ZohoProduct,
} from "./zoho.client.js";
import {
  getZohoCredential,
  type ZohoFieldMeta,
  type ZohoLayoutMeta,
  type ZohoLayoutSection,
  type ZohoPickListValue,
  type ZohoUser,
} from "./zoho.types.js";

/** What the settings page offers to map onto: Bigin pipelines and stages, and record owners. */

export async function fetchZohoPipelineMeta(orgId: string, product: ZohoProduct = "bigin") {
  const integration = await loadZohoIntegration(orgId);

  const credential = getZohoCredential(integration);
  const accessToken = await getValidZohoAccessToken(integration);

  // FETCH BOTH
  const [layoutResponse, fieldResponse] = await Promise.all([
    getZohoLayoutsMetadata(accessToken, "Pipelines", credential.api_domain, product),

    getZohoFieldMetadata(accessToken, "Pipelines", credential.api_domain, product),
  ]);

  // LAYOUTS
  const excludedFields = ["Deal_Name", "Stage", "Pipeline", "Sub_Pipeline", "Contact_Name"];

  const pipelines =
    layoutResponse.layouts?.map((layout: ZohoLayoutMeta) => {
      // GET REQUIRED FIELDS
      const requiredFields =
        layout.sections
          ?.flatMap((section: ZohoLayoutSection) => section.fields || [])
          ?.filter(
            (field: ZohoFieldMeta) =>
              (field.required || field.system_mandatory) &&
              !excludedFields.includes(field.api_name ?? ""),
          )
          ?.map((field: ZohoFieldMeta) => ({
            id: String(field.id),
            apiName: field.api_name,
            label: field.display_label,
            dataType: field.data_type,
            required: field.required,
            systemMandatory: field.system_mandatory,
          })) || [];

      return {
        id: String(layout.id),
        name: layout.display_label,
        apiName: layout.name,
        requiredFields,
      };
    }) || [];

  // FIELDS
  const fields = fieldResponse.fields || [];

  // SUB PIPELINE FIELD
  const subPipelineField = fields.find(
    (field: ZohoFieldMeta) => field.api_name === "Sub_Pipeline" && field.data_type === "picklist",
  );

  // STAGE FIELD
  const stageField = fields.find(
    (field: ZohoFieldMeta) => field.api_name === "Stage" && field.data_type === "picklist",
  );

  // SUB PIPELINES
  const subPipelines =
    subPipelineField?.pick_list_values
      ?.filter((pipeline: ZohoPickListValue) => pipeline.actual_value !== "-None-")
      .map((pipeline: ZohoPickListValue) => ({
        id: String(pipeline.id),
        name: pipeline.display_value,
        value: pipeline.actual_value,
      })) || [];

  // STAGES
  const stages =
    stageField?.pick_list_values
      ?.filter((stage: ZohoPickListValue) => stage.actual_value !== "-None-")
      .map((stage: ZohoPickListValue) => ({
        id: String(stage.id),
        name: stage.display_value,
        value: stage.actual_value,
      })) || [];

  return {
    success: true,
    pipelines,
    subPipelines,
    stages,
  };
}

export async function fetchZohoUsers(orgId: string, product: ZohoProduct = "bigin") {
  const integration = await loadZohoIntegration(orgId);

  const credential = getZohoCredential(integration);
  const accessToken = await getValidZohoAccessToken(integration);
  const response = await getZohoRecords(
    accessToken,
    "users",
    credential.api_domain,
    {
      type: "ActiveUsers",
    },
    undefined,
    product,
  );

  const users =
    response?.users?.map((user: ZohoUser) => ({
      id: String(user.id),
      name: user.full_name || `${user.first_name || ""} ${user.last_name || ""}`.trim(),
      email: user.email,
      status: user.status,
      zuid: user.zuid,
    })) || [];

  return {
    success: true,
    users,
  };
}
