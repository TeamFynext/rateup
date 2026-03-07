import { WHATSAPP_URL } from "../..";
import { axiosClient } from "../../../apiClient";

const RGROUPURL = `${WHATSAPP_URL}/waCustomerGroup`;

export const getWaCustomerGroups = async () => {
  const res = await axiosClient.get(RGROUPURL);
  return res.data;
};
export const getWaCustomerGroupsByTeamId = async (teamId: string) => {
  const res = await axiosClient.get(`${RGROUPURL}/team/${teamId}`);
  return res.data;
};

export async function getWaCustomerGroupSurveySendHistory(rgroupId: string) {
  const res = await axiosClient.get(`${RGROUPURL}/${rgroupId}/history/surveys`);
  return res.data;
}

export async function sendSurveyToWaCustomerGroup(
  rgroupId: string,
  surveyId: string,
  templateId: string,
) {
  const res = await axiosClient.get(
    `${WHATSAPP_URL}/survey/send/${surveyId}/template/${templateId}/waCustomerGroup/${rgroupId}`,
  );
  return res.data;
}

export async function createRgroupFromPhoneNumbers(
  teamId: string,
  groupName: string,
  phoneNumbers: Array<{ phone: string; name?: string }>,
) {
  const res = await axiosClient.post(RGROUPURL, {
    name: groupName,
    teamId,
    data: phoneNumbers,
  });
  return res.data;
}
export async function deleteWaCustomerFromWaCustomerGroup(
  rgroupId: string,
  waCustomerId: string,
) {
  const res = await axiosClient.delete(
    `${RGROUPURL}/${rgroupId}/waCustomer/${waCustomerId}`,
  );
  return res.data;
}

export async function deleteWaCustomerGroup(rgroupId: string) {
  const res = await axiosClient.delete(`${RGROUPURL}/${rgroupId}`);
  return res.data;
}

export async function getWaCustomersByWaCustomerGroup(rgroupId: string) {
  const res = await axiosClient.get(`${RGROUPURL}/${rgroupId}/waCustomers`);
  return res.data;
}

export async function updateWaCustomerGroup(
  rgroupId: string,
  rgroup: { name: string },
) {
  const res = await axiosClient.put(`${RGROUPURL}/${rgroupId}`, rgroup);
  return res.data;
}

/**
 *
 * @param rgroupId
 * @param waCustomers Array of waCustomer ids
 * @returns
 */
export async function addWaCustomers(
  rgroupId: string,
  waCustomers: Array<string>,
) {
  const res = await axiosClient.post(
    `${RGROUPURL}/${rgroupId}/waCustomers`,
    waCustomers,
  );
  return res.data;
}
