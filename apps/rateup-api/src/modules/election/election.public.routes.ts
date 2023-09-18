import { FastifyInstance } from "fastify";
import {
  getAllElectionConstituencyTeamByOrgHandler,
  getAllSurveysUnderConstituencyTeamHandler,
} from "./election.controller";
export async function electionPublicRoutes(server: FastifyInstance) {
  //get all constituencies(teams) from an organization
  server.get("/constituencies", getAllElectionConstituencyTeamByOrgHandler);
  server.get("/constituencies/:id", getAllSurveysUnderConstituencyTeamHandler);
}
