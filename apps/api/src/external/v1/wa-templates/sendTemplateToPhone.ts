import { log } from "../../../utils/logger.js";
import { WaTemplateComponentType } from "../../../types/enums.js";
import { getFileUrlFromKey } from "../../../utils/upload/s3Upload.js";
import { getFlowWithSurveyTeamMapIds } from "../../../modules/meta/whatsapp/flows/flow.service.js";
import { signFlowToken } from "../../../modules/meta/whatsapp/flows/flowToken.js";
import { sendMessage } from "../../../modules/meta/whatsapp/webhook/whatsapp.service.js";
import { createTemplateMessage } from "../../../modules/meta/whatsapp/webhook/whatsapp.utils.js";
import type { templateData } from "../../../modules/meta/whatsapp/templates/templates.service.js";
import { getFlowIdFromTemplateComponents } from "./wa_templates.utils.js";
import type { SendTemplateHeaderComponent } from "./wa_templates.external.schema.js";

/**
 * v1's send-to-contacts sender, moved here unchanged from the dashboard's
 * wa_templates.service.ts when the dashboard stopped using it.
 */
interface SendTemplateToPhoneProps {
  orgId: string;
  dbTemplate: templateData;
  phone: string;
  teamId: string | undefined;
  header: SendTemplateHeaderComponent | undefined;
  userId: string;
}
export async function sendTemplateToPhone({
  orgId,
  dbTemplate,
  header,
  phone,
  teamId,
  userId,
}: SendTemplateToPhoneProps) {
  log.trace("Sending template to phone %s", phone);

  const { data, defaultValues } = dbTemplate;
  const components = [];
  if (header) {
    components.push(header);
  }

  const containsFlowButton = !!getFlowIdFromTemplateComponents(data.components);

  if (containsFlowButton) {
    const flowId = getFlowIdFromTemplateComponents(data.components);
    if (!flowId) {
      log.error("Flow id not found in template\n Template => %o", data);
      throw new Error("Flow id not found in template");
    }
    // getting flow with surveyTeamMapId
    const dbFlow = await getFlowWithSurveyTeamMapIds(orgId, flowId);
    if (!dbFlow) {
      log.error("Flow not found in db with id %s", flowId);
      throw new Error("Flow not found in db");
    }

    if (!teamId) {
      log.error("Team id not found in request");
      throw new Error("Team id not found in request");
    }
    const surveyTeamMap = dbFlow?.survey?.teams.find((t) => t.teamId === teamId)?.id;
    if (!surveyTeamMap) {
      log.error("Team not found in survey;\nteam => %s", teamId);
      throw new Error("Team not found in survey");
    }

    // Pushed only once the survey mapping is known, so the flow token can carry
    // the run context rather than just the recipient's phone.
    components.push({
      type: "button",
      sub_type: "flow",
      index: 0,
      parameters: [
        {
          type: "action",
          action: {
            flow_token: signFlowToken({
              surveyTeamMapId: surveyTeamMap,
              orgId,
              phone,
              language: dbFlow?.survey?.languages[0],
            }),
          },
        },
      ],
    });
  }

  const containsImageComponent =
    dbTemplate.data.components.find((c) => c.type.toLowerCase() === WaTemplateComponentType.HEADER)
      ?.format === `IMAGE`;
  const containsImageOverrideInRequest = header?.parameters?.some((p) => p.type === "image");
  if (
    containsImageComponent &&
    !containsImageOverrideInRequest // if the request has image then don't add default image
  ) {
    if (!components.some((c) => c.type === "header")) {
      if (defaultValues?.image?.link) {
        components.push({
          type: "header",
          parameters: [
            {
              type: "image",
              image: {
                link: getFileUrlFromKey(defaultValues.image.link),
              },
            },
          ],
        });
      } else {
        throw new Error("Image not found in template. Please upload an image and try again");
      }
    } else {
      log.warn("A header component is already present in template");
    }
  }
  const templateQuery = {
    name: data?.name,
    language: {
      code: dbTemplate.data?.language,
    },
    components: components,
  };
  const templateMessage = createTemplateMessage(phone, templateQuery);
  await sendMessage(
    orgId,
    templateMessage,
    undefined,
    userId,
    undefined,
    undefined,
    undefined,
    teamId,
    "TEMPLATE",
    false,
    false,
  );
  log.trace("Template send to user successfully");
}
