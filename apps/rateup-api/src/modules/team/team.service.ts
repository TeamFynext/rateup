import prisma from "../../utils/prisma";
import { createUser } from "../user/user.service";
import { CreateTeamInput, GetTeamMembersInput, GetTeamsByOrgInput, InviteMemberInput } from "./team.schema";
import EmailPassword from "supertokens-node/recipe/emailpassword";
import EmailVerification from "supertokens-node/recipe/emailverification";
import { createEmailBody } from "../../utils/email/emailBody";
import { Role } from "../../utils/enums";
import { sendAWSEmail } from "../../utils/email/sendAWSEmail";

export async function createTeam(input: CreateTeamInput) {
  if (input.name.length < 2) {
    throw new Error("Invalid team name.");
  }

  try {
    // Start a transaction
    const result = await prisma.$transaction(async (prisma) => {
      const existingTeam = await prisma.team.findFirst({
        where: {
          name: input.name,
          orgId: input.orgId,
        },
      });

      if (existingTeam) {
        // Team with the same data combination already exists
        console.log('Team already exists!');
        throw new Error('Team already exists');
      } else {
        // Insert a new team
        const team = await prisma.team.create({
          data: {
            name: input.name,
            orgId: input.orgId,
          },
          select: {
            id: true,
            name: true,
          },
        });

        console.log('New team created:', team);
       
        // Second action: Insert teamId, userId to TeamMember table
        const teamMember = await prisma.teamMember.create({
          data: {
            teamId: team.id, // Use the teamId from the first action's result
            userId: input.userId,
          },
          select: {
            id: true, // Return the ID of the newly created row
            teamId: true,
            userId: true,
          },
        });

        return { team, teamMember };
      }
    });

    // Commit the transaction
    console.log("Transaction committed:", result);
    return result;
  } catch (error) {
    // Rollback the transaction
    console.error("Transaction rolled back:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export function getTeamsByOrgId(input: GetTeamsByOrgInput) {
  return prisma.team.findMany({
    where: {
      orgId: input.orgId,
    },
    select: {
      id: true,
      name: true,
    },
  });
}

export async function deleteTeamById(id: string) {
  const team = await prisma.team.delete({
    where: {
      id,
    },
  });
  return team;
}

export async function inviteTeamMember(input : InviteMemberInput){
  if (input.name.length < 2) {
    throw new Error("Invalid name.");
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (input.email.length < 6 || !emailRegex.test(input.email)) {
    throw new Error("Invalid email. Please enter a valid email address.");
  }
try {
    const { email, name, orgId, teamId, invitedBy, type } = input;

     // Check if team member with the input email already exists
    const existingTeamMember = await prisma.teamMember.findFirst({
      where: {
        user: {
          email,
        },
        team: {
          id: teamId,
        },
      },
    });

    if (existingTeamMember) {
      throw new Error('Team member with the provided email already exists in the team.');
    }


    // Check if the user with the input email is already a member in any organization with role SUPER_ADMIN
    const existingOrgMember = await prisma.orgMember.findFirst({
      where: {
        user: {
          email,
        },
        role: 'SUPER_ADMIN',
      },
    });

    if (existingOrgMember) {
      throw new Error('User with the provided email is already a SUPER_ADMIN member in an organization.');
    }

        // Check if the email already exists in the invitation table
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        teamId
      },
    });

    if (existingInvitation) {
      if (existingInvitation.status === 'PENDING') {
       
        // Call Resend email function here
       //TODO
        
        throw new Error('Invitation with the provided email is already pending.');
      }
       else if (existingInvitation.status === 'ACCEPTED' && existingInvitation.teamId === teamId) {
        throw new Error('Team member with the provided email already exists.');
      }
    }

    const newInvite = await prisma.invitation.create({
      data: {
        email,
        name,
        orgId,
        teamId,
        type,
        invitedBy
      }
    });

    if(newInvite){
      const msg = {
        to: email, // Change to your recipient
       // from: 'hello@rateup.app', // Change to your verified sender
        subject: 'Invitation to Join Team - RateUp.app',
        text: 'You are invited to manage a Team in RateUp. Click on the accept to continue with the process.',
        html: createEmailBody(`${process.env.FRONTEND_URL}/invite?type=team&token=${newInvite.id}`, email)
      }
      try {
        //sendEmail(msg);
        sendAWSEmail(msg)
      } catch (error) {
        console.error(error)
        throw new Error('Email sending failed. E:'+ error);
      }
  }
    
    console.log("Invite created successfully");
    return newInvite
    
  } catch (error) {
    console.error(error);
    throw error;
  }
}

//Complete Email invite
export async function completeInvite(token: string) {
  const invitation = await prisma.invitation.findUnique({
        where: { id: token }
    });
  
  if (!invitation) throw new Error('Invitation not found');

  const updatedInvitation = await prisma.invitation.update({
    where: {
      id: token,
    },
    data: {
      status: 'ACCEPTED',
    },
  });

  // find user in User table with the same email as the invitation
  const user = await prisma.user.findFirst({
    where: {
      email: updatedInvitation.email, 
    }
  });

  const isUser = user !== null;
  let redirectLink =''

  if(!isUser){
    //Create new user , verify email
    const FAKE_PASSWORD = "qwerty123";
    let signUpResult = await EmailPassword.signUp(updatedInvitation.email, FAKE_PASSWORD);
    if (signUpResult.status === "EMAIL_ALREADY_EXISTS_ERROR") {
        throw new Error('User already exists');
    }

    const tokenRes = await EmailVerification.createEmailVerificationToken(signUpResult.user.id);
    if (tokenRes.status === "OK") {
        await EmailVerification.verifyEmailUsingToken(tokenRes.token);
        let id = signUpResult.user.id
        let email = updatedInvitation.email
        const user = await createUser({ id, email });

        if(!user){
          throw new Error('failed user adding');
        }

          await prisma.user.update({
          where: { id: id },
          data: { name: updatedInvitation.name },
        });
    }
    //Create as ADMIN / SUPER_ADMIN in orgMember based on invite type
    if (updatedInvitation.type === 'TEAM') {
        let orgMember = await prisma.orgMember.create({
            data: {
              orgId: updatedInvitation.orgId,
              userId: signUpResult.user.id,
              role: Role.ADMIN,
            },
          });

      //Create Team member
      if (orgMember && updatedInvitation.teamId) {
                createTeamMemberIfNotExists(updatedInvitation.teamId, signUpResult.user.id)
        }
      // change password page
      let passwordResetToken = await EmailPassword.createResetPasswordToken(signUpResult.user.id);

      if (passwordResetToken.status === "UNKNOWN_USER_ID_ERROR") {
          throw new Error("Should never come here");
      }
      redirectLink = `${process.env.FRONTEND_URL}/login/reset-password?token=` + passwordResetToken.token+`&rid=emailpassword`
    }

  }
  else{  //for existing user
    if (!user.name) {
        await prisma.user.update({
            where: { id: user.id },
            data: { name: updatedInvitation.name },
        });
    }

    let orgMember = await prisma.orgMember.findFirst({
      where: { userId: user.id },
      select: {
        orgId: true,
        role: true,
      },
    });
    if (!orgMember) {
        let orgMember = await prisma.orgMember.create({
            data: {
              orgId: updatedInvitation.orgId,
              userId: user.id,
              role: Role.ADMIN,
            },
          });
        //Create Team member
        if (orgMember && updatedInvitation.teamId) {
            const teamMember = await prisma.teamMember.create({
                data: {
                  teamId: updatedInvitation.teamId,
                  userId: user.id,
                },
            });
         }
    }else{
      if (orgMember && updatedInvitation.teamId) {
        createTeamMemberIfNotExists(updatedInvitation.teamId, user.id)
      }
    }

    redirectLink=`${process.env.FRONTEND_URL}/login}`
  }

  return {...updatedInvitation, isUser: isUser, redirectLink};
}


async function createTeamMemberIfNotExists(teamId : string, userId : string) {
  // Fetch the record with the same teamId and userId
  const existingTeamMember = await prisma.teamMember.findFirst({
    where: {
      teamId: teamId,
      userId: userId,
    }
  });

  // If the record doesn't exist, create a new one
  if (!existingTeamMember) {
    const teamMember = await prisma.teamMember.create({
      data: {
        teamId: teamId,
        userId: userId,
      },
    });
    return teamMember;
  }
  else {
    throw new Error('Team member Record already exists');
  }
}


export function getTeamMembers(input: GetTeamMembersInput) {
  return prisma.teamMember.findMany({
    where: {
      teamId: input.teamId,
    },
    select: {
      id: true, // or any other fields you want from teamMember
      user: {
        select: {
          id: true,
          email:true,
          name: true,
        },
      },
    },
  });
}

export async function getTeamsByUserId(userId: string) {
  const teams = await prisma.teamMember.findMany({
    where: {
      userId,
    },
    select: {
      team: {
        select: {
          id: true,
          name: true, // Team name
        }
      }
    }
  });

  const teamData = teams.map(team => {
    return {
      teamId: team.team.id,
      teamName: team.team.name,
    }
  });
  

  return teamData;
}