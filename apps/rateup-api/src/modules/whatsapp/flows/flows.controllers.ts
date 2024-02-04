import { getBusinessIdAccessToken } from "./utils";
import { callWhatsappApi } from "../wa_axios";

async function getFlows(req, rep) {
  const { businessId, accessToken } = await getBusinessIdAccessToken(req);
  const { data } = await callWhatsappApi(
    `/${businessId}/flows`,
    "GET",
    accessToken,
  );
  rep.code(200).send(data["data"]);
}

async function createFlow(req, rep) {
  try {
    const { businessId, accessToken } = await getBusinessIdAccessToken(req);
    const newFlowData = req.body;
    const { data } = await callWhatsappApi(
      `/${businessId}/flows`,
      "POST",
      accessToken,
      { ...newFlowData },
    );

    rep.code(201).send(data["data"]);
  } catch (err) {
    console.log(err);
    rep.code(500).send("unable to create flow");
  }
}

async function getSingleFlow(req, rep) {
  const { accessToken } = await getBusinessIdAccessToken(req);
  const flowId = req.params.flowId;
  const url = `/${flowId}?fields=id,name,categories,preview,status,validation_errors,json_version,data_api_version,data_channel_uri,whatsapp_business_account,application`;
  const { data } = await callWhatsappApi(url, "GET", accessToken);
  rep.code(200).send(data);
}

export { getFlows, createFlow, getSingleFlow };
