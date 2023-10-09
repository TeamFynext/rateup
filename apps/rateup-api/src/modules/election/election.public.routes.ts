import { FastifyInstance } from "fastify";
import {
  getAllElectionConstituencyTeamByOrgHandler,
  getAllMpHandler,
  getAllPartiesHandler,
  getAllSurveysUnderConstituencyTeamHandler,
} from "./election.controller";
export async function electionPublicRoutes(server: FastifyInstance) {
  //get all constituencies(teams) from an organization
  server.get("/constituencies", getAllElectionConstituencyTeamByOrgHandler);
  server.get("/constituencies/:id", getAllSurveysUnderConstituencyTeamHandler);
  server.get("/mps", getAllMpHandler); //includes query rank which enables ranking of mps
  server.get("/parties", getAllPartiesHandler); //includes query rank which enables ranking of parties
}
