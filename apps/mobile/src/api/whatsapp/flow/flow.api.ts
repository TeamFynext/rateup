import axios from "@/config/axios";
import { DbFlow } from "../types";

const BASE = `/api/whatsapp/flows`;

export async function getWaFlowsFromDb() {
  const res = await axios.get(`${BASE}?source=db`);
  return res.data as DbFlow[];
}

export async function getWaFlowFromDb(flowId: string) {
  const res = await axios.get(`${BASE}/${flowId}`);
  return res.data as DbFlow;
}
