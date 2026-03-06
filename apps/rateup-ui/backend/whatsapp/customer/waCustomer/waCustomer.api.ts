import { WHATSAPP_URL } from "../..";
import { axiosClient } from "../../../apiClient";

const WA_CUSTOMER_URL = `${WHATSAPP_URL}/waCustomer`;

// TODO: add pagination
export async function getAllWaCustomers() {
  const res = await axiosClient.get(WA_CUSTOMER_URL);
  return res.data;
}
export async function getWaCustomersByTeamId(teamId: string) {
  const res = await axiosClient.get(`${WA_CUSTOMER_URL}/team/${teamId}`);
  return res.data;
}
export async function getAllWaCustomerSurveySendHistory(phone: string) {
  const res = await axiosClient.get(
    `${WA_CUSTOMER_URL}/phone/${phone}/history/surveys`,
  );
  return res.data;
}
export async function getWaCustomerSurveySendHistoryByWaCustomerId(
  waCustomerId: string,
) {
  const res = await axiosClient.get(
    `${WA_CUSTOMER_URL}/${waCustomerId}/history/surveys`,
  );
  return res.data;
}

export async function sendSurveyToWaCustomer(
  waCustomerId: string,
  surveyId: string,
  templateId: string,
) {
  const res = await axiosClient.get(
    `${WHATSAPP_URL}/survey/send/${surveyId}/template/${templateId}/waCustomer/${waCustomerId}`,
  );
  return res.data;
}
export async function getAllWaCustomerResponseHistory(phone: string) {
  const res = await axiosClient.get(
    `${WA_CUSTOMER_URL}/phone/${phone}/history/responses`,
  );
  return res.data;
}
export async function getWaCustomerResponseHistoryByWaCustomerId(
  waCustomerId: string,
) {
  const res = await axiosClient.get(
    `${WA_CUSTOMER_URL}/${waCustomerId}/history/responses`,
  );
  return res.data;
}

export async function createWaCustomers(
  waCustomers: Array<{ phone: string; name?: string }>,
  teamId: string,
) {
  const res = await axiosClient.post(WA_CUSTOMER_URL, { waCustomers, teamId });
  return res.data;
}

export async function updateWaCustomer(
  waCustomerId: string,
  waCustomer: { name?: string },
) {
  const res = await axiosClient.put(
    `${WA_CUSTOMER_URL}/${waCustomerId}`,
    waCustomer,
  );
  return res.data;
}

export async function getAllWaCustomerGroupsByWaCustomer(waCustomerId: string) {
  const res = await axiosClient.get(
    `${WA_CUSTOMER_URL}/${waCustomerId}/groups`,
  );
  return res.data;
}

export async function deleteWaCustomer(waCustomerId: string) {
  const res = await axiosClient.delete(`${WA_CUSTOMER_URL}/${waCustomerId}`);
  return res.data;
}
