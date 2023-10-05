import JsonWebToken, { JwtHeader, SigningKeyCallback } from "jsonwebtoken";
import prisma from "./prisma";
import jwksClient from 'jwks-rsa';
import { getCookieValue } from "./http";
import { FastifyReply, FastifyRequest } from "fastify";
import Session from "supertokens-node/recipe/session";
import { getUserByEmail } from "../modules/user/user.service";

export async function getUserIdFromRequest(request: FastifyRequest, reply: FastifyReply) {
  let session = await Session.getSession(request, reply);
  return session.getUserId();
}

export async function hasAccessToSurvey(surveyId: string, userId: string) {
  try {
    const survey = await prisma.survey.findUnique({
      where: {
        id: surveyId,
      },
    });
    const teamId = survey!.teamId;
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId,
        teamId,
      },
    });
    return teamMember !== null;
  } catch (e) {
    console.log(e);
    return false;
  }
}

export async function hasAccessToTeam(teamId: string, userId: string) {
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      userId,
      teamId,
    },
  });
  return teamMember !== null;
}

export async function hasAccessOfTeamAdmin(teamId: string, userId: string) {
  const teamMember = await hasAccessToTeam(teamId, userId)

  if (teamMember) {
    const superAdmin = await prisma.orgMember.findFirst({
      where: {
        userId: userId,
        org: {
          teams: {
            some: {
              id: teamId,
            },
          },
        },
        role: 'SUPER_ADMIN',
      },
    });

    if (!superAdmin) {
      return false;
    } else {
      return true
    }
  }

  return false;
}

const jwksClientInstance = jwksClient({
  jwksUri: `${process.env.API_URL}/api/auth/jwt/jwks.json`,
})

function getKey(header: JwtHeader, callback: SigningKeyCallback) {
  jwksClientInstance.getSigningKey(header.kid, function (err, key) {
    var signingKey = key!.getPublicKey();
    callback(err, signingKey);
  });
}

/**
 * Used for requests that may be sent from getServersideProps (or any other serverside functions)
 * Expects either a session cookie or a JWT token in the Authorization header
 * @param request 
 * @param reply 
 * @returns userId
 */
export const authorizeBySessionOrJWT = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const cookieToken = getCookieValue('sAccessToken', request.headers.cookie) || getCookieValue('st-access-token', request.headers.cookie)
    let userId = null;
    if (cookieToken) {
      // if cookieToken is present, we are using supertokens session verification
      const session = await Session.getSession(request, reply);
      userId = session.getUserId();
    } else if (request.headers.authorization) {
      // else we are using manual jwt verification
      const token = request.headers.authorization.split(' ')[1]
      if (!token) {
        reply.code(401).send({ message: "Unauthorized" });
        return
      }

      try {
        const decoded = await verifyJWT(token)

        const { email } = decoded as any;
        const user = await getUserByEmail(email)
        if (!user) {
          reply.code(401).send({ message: "Unauthorized" });
          return
        } else {
          userId = user.id
        }
      } catch (err) {   
        if (err?.message === 'Token has expired') {
          reply.code(401).send({ message: "Token has expired" });
        } else {
          throw err;
        }
      }
    }
    return userId
  } catch (err) {
    console.log(err)
    return null
  }
}

export const verifyJWT = (jwt: string) => {
  return new Promise((resolve, reject) => {
    JsonWebToken.verify(jwt, getKey, {}, function (err, decoded) {
      if (err) {
        if (err?.name === 'TokenExpiredError') {
          reject(new Error('Token has expired'));
        } else {
          reject(err);
        }
      } else {
        resolve(decoded)
      }
    });
  })
}