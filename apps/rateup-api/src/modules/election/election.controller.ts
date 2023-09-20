/**
 * This file includes the controllers for the election module.
 *
 * tag[0] is state code
 * tag[1] is party name
 * tag[2] is mp name
 *
 * More description continues here.
 */

import { FastifyReply, FastifyRequest } from "fastify";
import { GetTeamsByOrgInput } from "../team/team.schema";
import {
  getAllMedia,
  getAllSurveyResponsesBySurveyIds,
  getAllSurveysUnderOrganization,
  getElectionConstituencyTeamsByOrgId,
  getSurveysByConstituency,
} from "./election.service";
import { electionConfig } from "./election.config";
import { GetSurveyByIdParams } from "../survey/survey.schema";
import { rankQuerySchema } from "./election.schema";
import { ratingObjectType } from "./election.types";
import { average, compareByRating } from "./election.helper";
export async function getAllElectionConstituencyTeamByOrgHandler(
  request: FastifyRequest<{
    Params: GetTeamsByOrgInput;
  }>,
  reply: FastifyReply
) {
  try {
    const teams = await getElectionConstituencyTeamsByOrgId(
      electionConfig.orgId
    );
    if (!teams || teams.length === 0) {
      reply
        .code(404)
        .send({ message: "No Constituencies found at the moment" });
    } else {
      reply.send(teams);
    }
  } catch (e) {
    reply.code(500).send({ message: "Internal server error" });
  }
}

export async function getAllSurveysUnderConstituencyTeamHandler(
  request: FastifyRequest<{
    Params: GetSurveyByIdParams;
  }>,
  reply: FastifyReply
) {
  try {
    const surveys = await getSurveysByConstituency(request.params.id);
    if (!surveys || surveys.length === 0) {
      reply.code(404).send({ message: "No Surveys found at the moment" });
    } else {
      reply.send(surveys);
    }
  } catch (e) {
    reply.code(500).send({ message: "Internal server error" });
  }
}

//this controller returns the list of mps from the database along with their associated images and party
export async function getAllMpHandler(
  request: FastifyRequest<{ Querystring: rankQuerySchema }>,
  reply: FastifyReply
) {
  try {
    const constituencies = await getElectionConstituencyTeamsByOrgId(
      electionConfig.orgId
    );
    const media = await getAllMedia();
    const mpMedia = media.filter((media) => media.type === "mp");
    const partyMedia = media.filter((media) => media.type === "party");
    const tagArray = constituencies
      .filter((constituency) => constituency.tags.length != 0)
      .map((constituency) => constituency.tags);
    //only true if query rank is true
    let surveyResponses: any;
    let surveys: any;
    if (request.query.rank) {
      const teamIds = constituencies.map((constituency) => constituency.id);
      surveys = await getAllSurveysUnderOrganization(teamIds);
      const surveyIds = surveys.map((survey) => survey.id);
      surveyResponses = await getAllSurveyResponsesBySurveyIds(surveyIds);
    }
    const result = [];
    await Promise.all(
      tagArray.map((tag, i) => {
        const resultSchema: ratingObjectType = {
          name: "",
          image: "",
          party: "",
          partyLogo: "",
          state: "",
          rating: 0,
          no_of_responses: 0,
        };
        resultSchema.name = tag[2].split("_")[1];
        resultSchema.state = tag[0].split("_")[1];
        resultSchema.image = mpMedia.find(
          (media) => media.name === tag[2].split("_")[1]
        ).image;
        resultSchema.party = tag[1].split("_")[1];
        resultSchema.partyLogo = partyMedia.find(
          (media) => media.name === tag[1].split("_")[1]
        ).image;
        if (request.query.rank) {
          let filteredSurveyResponses = surveyResponses.filter(
            (response) =>
              response.surveyId ===
              surveys.find((survey) => survey.teamId === constituencies[i].id)
                .id
          );
          if (filteredSurveyResponses.length !== 0) {
            let avgRating: number;
            avgRating = filteredSurveyResponses.reduce(
              (acc, response) => acc + response.responses[0].response.Rating,
              0
            );
            avgRating = avgRating / filteredSurveyResponses.length;
            resultSchema.rating = avgRating;
            resultSchema.no_of_responses = filteredSurveyResponses.length;
          }
        }
        !request.query.rank &&
          delete resultSchema.rating &&
          delete resultSchema.no_of_responses;
        result.push(resultSchema);
      })
    );
    //if rank is true then we will sort the mps based on the survey responses
    request.query.rank && result.sort(compareByRating);
    reply.send(result);
  } catch (e) {
    reply.code(500).send({ message: "Internal server error" });
  }
}

//this controller returns the list of parties from the database along with their associated images

export async function getAllPartiesHandler(
  request: FastifyRequest<{ Querystring: rankQuerySchema }>,
  reply: FastifyReply
) {
  try {
    const constituencies = await getElectionConstituencyTeamsByOrgId(
      electionConfig.orgId
    );
    const media = await getAllMedia();
    const partyMedia = media.filter((media) => media.type === "party");
    let tagArray = constituencies
      .filter((constituency) => constituency.tags.length != 0)
      .map((constituency) => constituency.tags[1].split("_")[1]);
    tagArray = [...new Set(tagArray)];
    let surveyResponses: any;
    let surveys: any;
    if (request.query.rank) {
      const teamIds = constituencies.map((constituency) => constituency.id);
      surveys = await getAllSurveysUnderOrganization(teamIds);
      const surveyIds = surveys.map((survey) => survey.id);
      surveyResponses = await getAllSurveyResponsesBySurveyIds(surveyIds);
    }
    const result = [];
    await Promise.all(
      tagArray.map((tag, i) => {
        const resultSchema: ratingObjectType = {
          name: "",
          image: "",
          rating: 0,
          no_of_responses: 0,
        };
        resultSchema.name = tag;
        resultSchema.image = partyMedia.find(
          (media) => media.name === tag
        ).image;
        if (request.query.rank) {
          let groupedSurveys = surveys.filter((survey) =>
            survey.tags.includes(`party_${tag}`)
          );
          let filteredResponses = [];
          groupedSurveys.map((gs) => {
            let temp = surveyResponses.filter(
              (response) => response.surveyId === gs.id
            );
            temp.map((sr) => {
              filteredResponses.push(sr);
            });
          });
          let avg = average(
            filteredResponses.map((fr) => fr.responses[0].response.Rating)
          );
          resultSchema.rating = avg;
          resultSchema.no_of_responses = filteredResponses.length;
        }
        !request.query.rank &&
          delete resultSchema.rating &&
          delete resultSchema.no_of_responses;
        result.push(resultSchema);
      })
    );
    //if rank is true then we will sort the parties based on the survey responses
    request.query.rank && result.sort(compareByRating);
    reply.send(result);
  } catch (e) {
    reply.code(500).send({ message: "Internal server error" });
  }
}
