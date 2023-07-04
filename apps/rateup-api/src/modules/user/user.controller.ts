
import { FastifyReply, FastifyRequest } from "fastify";
import { createUserSignup, getLoggedUserInfo } from "./user.service";
import { CreateUserGoogleSchema, CreateUserSignupSchema } from "./user.schema";
import ThirdPartyEmailPassword from "supertokens-node/recipe/thirdpartyemailpassword";
import Session from "supertokens-node/recipe/session";
import { Prisma } from '@prisma/client';

export async function getLoggedUserInfoHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const userData =  await getLoggedUserInfo(request, reply);
    if (!userData) {
      reply.code(200).send({ message: "No user data found" });
    } else {
      reply.code(200).send({ message: "Success", data: userData });
    }
  } catch (e) {
    reply.code(500).send({ message: `Internal server error :  ${e}` });
  }
}


export async function createGoogleUserHandler(
  request: FastifyRequest<{
    Body: CreateUserGoogleSchema ;
  }>,
  reply: FastifyReply
) {

  if (request?.body?.inviteCode !== process.env.INVITE_CODE) {
    let message ="Invite code is not valid."
    reply.code(500).send({ success: false, message });
      return;
  }else{
    let session = await Session.getSession(request, reply);
    let userId = session.getUserId();
  
    let user;
    let userInfo = await ThirdPartyEmailPassword.getUserById(userId);
  
    let data = {
      id: userId,
      email: userInfo?.email !== undefined ? userInfo.email : '',
      name: request?.body?.name,
      orgName: request?.body?.orgName,
    }
    try {
      user = await createUserSignup(data);
    } catch (e: any) {
      console.error(e);
      let message = e.message;
    
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        message = 'User already exists. Please logout and Login again.';
      }
  
      reply.code(500).send({ success: false, message });
      return;
    }
    
    reply.code(201).send(user);
  }

}
