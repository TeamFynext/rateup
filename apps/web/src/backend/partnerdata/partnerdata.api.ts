import { axiosClient } from "../apiClient";

export interface PartnerData {
  // Step 1
  fullName: string;
  workEmail: string;
  phone: string;
  companyName: string;
  website: string;
  country: string;
  // Step 2
  businessType: string;
  companySize: string;
  yearsInBusiness: string;
  // Step 3
  whyPartner: string;
  services: string[];
  referralVolume: string;
  managesClients: string;
  // Step 4
  apiExperience: string;
  canOnboard: string;
}

export async function submitPartnerApplication(data: PartnerData) {
  const res = await axiosClient.post("/bookdemo/partner", data);
  return res.data;
}
