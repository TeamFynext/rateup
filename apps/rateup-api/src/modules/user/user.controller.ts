
import { FastifyReply, FastifyRequest } from "fastify";
import { createUserSignup, getLoggedUserInfo } from "./user.service";
import { ChangeUserPasswordSchema, CreateUserGoogleSchema, CreateUserSignupSchema } from "./user.schema";
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

export async function changeUserPasswordHandler(
  req: FastifyRequest<{
    Body: ChangeUserPasswordSchema ;
  }>,
  reply: FastifyReply
) {

   // get the supertokens session object from the req
   //let session = req.session
   let session = await Session.getSession(req, reply);

   // retrive the old password from the request body
   let oldPassword = req.body.existingPassword

   // retrive the new password from the request body
   let updatedPassword = req.body.newPassword

   // get the user's Id from the session
   let userId = session!.getUserId()

   // get the signed in user's email from the getUserById function
   let userInfo = await ThirdPartyEmailPassword.getUserById(userId)

   if (userInfo === undefined) {
       let message ="Access failed"
       reply.code(500).send({ success: false, message });
       throw new Error("Should never come here")
   }

   // call signin to check that input password is correct
   let isPasswordValid = await ThirdPartyEmailPassword.emailPasswordSignIn(userInfo?.email, oldPassword)

   if (isPasswordValid.status !== "OK") {
       // TODO: handle incorrect password error
       let message ="Incorrect old password"
       reply.code(500).send({ success: false, message });
       return
   }


   // update the user's password using updateEmailOrPassword
   let response = await ThirdPartyEmailPassword.updateEmailOrPassword({
       userId,
       password: updatedPassword
   })

   if (response?.status === "PASSWORD_POLICY_VIOLATED_ERROR") {
       // TODO: handle incorrect password error
       console.log("..........................incorrect password format")
       let message ="Incorrect password format"
       reply.code(500).send({ success: false, message });
       return
   }
   
   // TODO: send successful password update response

   let message ="Successfully updated password"
    reply.code(200).send({ success: true, message });

}