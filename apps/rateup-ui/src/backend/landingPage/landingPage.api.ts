import { axiosClient } from "../apiClient";

const url = "/landingPages";

async function getLandingPages() {
  const res = await axiosClient.get(url);
  return res.data;
}

function getLandingPageWithShortId(shortUrlId) {
  return async () => {
    const res = await axiosClient.get(`${url}/${shortUrlId}`);
    return res.data;
  };
}

async function getPublicLandingPageWithShortId(shortUrlId) {
  const res = await axiosClient.get(`${url}/public/${shortUrlId}`);
  return res.data;
}

async function createLandingPage(data) {
  const res = await axiosClient.post(url, data);
  return res.data;
}

async function updateLandingPage(data: any) {
  const res = await axiosClient.put(url, data);
  return res.data;
}

async function deleteLandingPage(id) {
  const res = await axiosClient.delete(`${url}/${id}`);
  return res.data;
}

function getDropdownOptionsOfLinkType(linkType) {
  return async () => {
    const res = await axiosClient.get(`${url}/linkTypeDropdownOptions/${linkType}`);
    return res.data;
  };
}

async function updatePageVisits(shortUrlId) {
  const res = await axiosClient.patch(`${url}/pageVisits/${shortUrlId}`);
  return res.data;
}

export {
  getLandingPages,
  getLandingPageWithShortId,
  getPublicLandingPageWithShortId,
  createLandingPage,
  updateLandingPage,
  deleteLandingPage,
  getDropdownOptionsOfLinkType,
  updatePageVisits,
};
