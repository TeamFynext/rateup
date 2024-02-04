import { checkSession } from "../../../utils/checkSession";
import { createFlow, getFlows, getSingleFlow } from "./flows.controllers";

export async function waFlowsRoutes(server) {
  server.addHook("preHandler", checkSession);

  server.get("/", getFlows);
  server.get("/:flowId", getSingleFlow);
  server.post("/", createFlow);
}
