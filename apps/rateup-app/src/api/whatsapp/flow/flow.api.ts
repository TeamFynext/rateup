import axios from "@/src/config/axios";
import { DbFlow } from "../types";

const BASE = `/api/wa/flows`;
export async function getWaFlowsFromDb() {
  const res = await axios.get(`${BASE}?source=db`);
  return res.data as DbFlow[];
}