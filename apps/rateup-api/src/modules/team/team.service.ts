import Session from "supertokens-node/recipe/session/index.js";
import prisma from "../../utils/prisma.js";
import { createUser, getUserRecipeName } from "../user/user.service.js";
import {
  CreateTeamInput,
  EditTeamInput,
  GetTeamMembersInput,
  GetTeamsByOrgInput,
  IdParamInput,
  InviteMemberInput,
} from "./team.schema.js";
import EmailVerification from "supertokens-node/recipe/emailverification/index.js";
import { createEmailBody } from "../../utils/email/supertoken/inviteEmail.js";
import { Role } from "../../utils/enums/index.js";
import { sendAWSEmail } from "../../utils/email/sendAWSEmail.js";

import EmailPassword from "supertokens-node/recipe/emailpassword/index.js";

import { FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "../../../generated/prisma/client.js";
import {
  createHubSpotContact,
  getHubSpotCompanyByOwnerEmail,
} from "../../utils/hubspot.js";

import { getEmailBodyTemplate } from "../email/email.util.js";

export async function createTeam(input: CreateTeamInput) {
  if (input.name.length < 3) {
    throw new Error("Invalid team name.");
  }

  if (input.code.length < 2) {
    throw new Error("Invalid team code.");
  }

  const existingTeamCode = await prisma.team.findFirst({
    where: {
      code: input.code,
      orgId: input.orgId,
    },
  });

  if (existingTeamCode) {
    throw new Error("Team Code already in use");
  }

  const existingTeam = await prisma.team.findFirst({
    where: {
      name: input.name,
      orgId: input.orgId,
    },
  });

  if (existingTeam) {
    // Team with the same data combination already exists
    throw new Error("Team already exists");
  }

  try {
    // Start a transaction
    const result = await prisma.$transaction(async (prisma) => {
      if (!existingTeam) {
        // Insert a new team
        const team = await prisma.team.create({
          data: {
            name: input.name,
            code: input.code.trim(),
            orgId: input.orgId,
            color: input.color,
          },
          select: {
            id: true,
            name: true,
            code: true,
          },
        });

        console.log("New team created:", team);

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

    result &&
      (await prisma.usageStats.update({
        where: { orgId: input.orgId },
        data: { teamsCount: { increment: 1 } },
      }));

    return result;
  } catch (error) {
    // Rollback the transaction
    console.error("Transaction rolled back:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export function getTeamsByOrgId(input: GetTeamsByOrgInput, page?) {
  return prisma.team.findMany({
    where: {
      orgId: input.orgId,
    },
    select: {
      id: true,
      name: true,
    },
    ...(page !== undefined
      ? {
          take: 20,
          skip: page * 20,
        }
      : {}),
  });
}

export async function deleteTeamById(id: string) {
  const team = await prisma.team.delete({
    where: {
      id,
    },
  });

  team &&
    (await prisma.usageStats.update({
      where: { orgId: team.orgId },
      data: { teamsCount: { decrement: 1 } },
    }));
  return team;
}

//used in zapier controller also
export async function inviteTeamMember(input: InviteMemberInput) {
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
      throw new Error(
        "Team member with the provided email already exists in the team.",
      );
    }

    // Check if the user with the input email is already a member in any organization with role SUPER_ADMIN
    const existingMemberships = await prisma.orgMember.findMany({
      where: {
        user: {
          email,
        },
      },
    });

    if (existingMemberships.length) {
      const memberOfGroup = existingMemberships.find((o) => o.orgId === orgId);
      if (memberOfGroup) {
        const teamMember = await prisma.teamMember.create({
          data: {
            teamId: input.teamId,
            userId: memberOfGroup.userId,
          },
          include: {
            team: {
              select: {
                name: true,
              },
            },
          },
        });
        const invitedPerson = await prisma.orgMember.findFirst({
          where: {
            userId: invitedBy,
            orgId,
          },
          select: {
            user: {
              select: {
                name: true,
              },
            },
            org: {
              select: {
                name: true,
              },
            },
          },
        });
        const msg = {
          to: email,
          subject: `${invitedPerson.user.name} add you to the Team ${teamMember.team.name} - RateUp.app`,
          text: `You have been added to manage a Team in RateUp by ${invitedPerson.org.name}`,
          html: getEmailBodyTemplate("GeneralTemplate", {
            body: `Explore features of new team by visiting RateUp. You can switch between teams to view the team wise details`,
            buttonLink: `${process.env.FRONTEND_URL}/dashboard`,
          }),
        };
        try {
          sendAWSEmail(msg);
        } catch (error) {
          console.error(error);
          throw new Error("Email sending failed. E:" + error);
        }
        return { ...input, existing: true };
      }
      const anotherOrgOwner = existingMemberships.find(
        (o) => o.orgId !== orgId && o.role === "SUPER_ADMIN",
      );
      if (anotherOrgOwner)
        throw new Error(
          "User with the provided email is already a SUPER_ADMIN member in an organization.",
        );
    }

    // Check if the email already exists in the invitation table
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        teamId,
      },
    });

    const user = await prisma.user.findFirst({
      where: {
        email,
      },
    });

    if (existingInvitation) {
      if (existingInvitation.status === "PENDING") {
        // Call Resend email function here
        //TODO

        throw new Error(
          "Invitation with the provided email is already pending.",
        );
      } else if (
        existingInvitation.status === "ACCEPTED" &&
        existingInvitation.teamId === teamId
      ) {
        if (!user) {
          await deleteMemberInvite(existingInvitation.id);
        } else {
          throw new Error(
            "Team member with the provided email already exists.",
          );
        }
      }
    }

    const newInvite = await prisma.invitation.create({
      data: {
        email,
        name,
        orgId,
        teamId,
        type,
        invitedBy,
      },
    });

    if (newInvite) {
      const msg = {
        to: email, // Change to your recipient
        // from: 'hello@rateup.app', // Change to your verified sender
        subject: "Invitation to Join Team - RateUp.app",
        text: "You are invited to manage a Team in RateUp. Click on the accept to continue with the process.",
        html: createEmailBody(
          `${process.env.FRONTEND_URL}/invite?type=team&token=${newInvite.id}`,
          email,
        ),
      };
      try {
        //sendEmail(msg);
        sendAWSEmail(msg);
      } catch (error) {
        console.error(error);
        throw new Error("Email sending failed. E:" + error);
      }
    }

    console.log("Invite created successfully");

    newInvite &&
      (await prisma.usageStats.update({
        where: { orgId: orgId },
        data: { teamMembersCount: { increment: 1 } },
      }));

    return newInvite;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

/**
 * Resend team member invite email
 * @param id
 * @returns
 */
export async function resendInviteTeamMember(id: string) {
  const existingInvitation = await prisma.invitation.findFirst({
    where: {
      id,
    },
  });
  if (existingInvitation && existingInvitation.status === "PENDING") {
    const msg = {
      to: existingInvitation?.email,
      subject: "Invitation to Join Team - RateUp.app",
      text: "You are invited to manage a Team in RateUp. Click on the accept to continue with the process.",
      html: createEmailBody(
        `${process.env.FRONTEND_URL}/invite?type=team&token=${existingInvitation?.id}`,
        existingInvitation?.email,
      ),
    };
    await sendAWSEmail(msg);
  }
  return "sent";
}

//Complete Email invite
export async function completeInvite(token: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { id: token },
  });

  if (!invitation) throw new Error("Invitation not found");

  const updatedInvitation = await prisma.invitation.update({
    where: {
      id: token,
    },
    data: {
      status: "ACCEPTED",
    },
    include: {
      org: {
        select: {
          name: true,
          owner: {
            select: {
              email: true,
            },
          },
        },
      },
      team: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  });

  // find user in User table with the same email as the invitation
  const user = await prisma.user.findFirst({
    where: {
      email: updatedInvitation.email,
    },
  });

  const isUser = user !== null;
  let redirectLink = "";

  if (!isUser) {
    //Create new user , verify email
    const FAKE_PASSWORD = "qwerty123";
    let signUpResult = await EmailPassword.signUp(
      "public",
      updatedInvitation.email,
      FAKE_PASSWORD,
    );
    if (signUpResult.status === "EMAIL_ALREADY_EXISTS_ERROR") {
      throw new Error("User already exists");
    }

    const tokenRes = await EmailVerification.createEmailVerificationToken(
      "public",
      signUpResult.recipeUserId, //TODO VERIFY SUPERTOKEN STT
    );

    if (tokenRes.status === "OK") {
      await EmailVerification.verifyEmailUsingToken("public", tokenRes.token);
      let id = signUpResult.user.id;
      let email = updatedInvitation.email;
      let recipeName = getUserRecipeName(
        signUpResult.user.loginMethods[0].recipeId,
      );
      const user = await createUser({ id, email, recipeName });

      if (!user) {
        throw new Error("failed user adding");
      }

      await prisma.user.update({
        where: { id: id },
        data: { name: updatedInvitation.name },
      });
    }
    //Create as ADMIN / SUPER_ADMIN in orgMember based on invite type
    if (updatedInvitation.type === "TEAM") {
      let orgMember = await prisma.orgMember.create({
        data: {
          orgId: updatedInvitation.orgId,
          userId: signUpResult.user.id,
          role: Role.ADMIN,
        },
      });

      //Create Team member
      if (orgMember && updatedInvitation.teamId) {
        createTeamMemberIfNotExists(
          updatedInvitation.teamId,
          signUpResult.user.id,
        );
      }

      const linkResponse = await EmailPassword.createResetPasswordLink(
        "public",
        signUpResult.user.id,
        updatedInvitation.email,
      );

      if (linkResponse.status === "OK") {
        console.log(linkResponse.link);
        redirectLink = linkResponse.link;
      } else {
        console.log("User not exists");

        // user does not exist or is not an email password user
      }
    }

    const companyId = await getHubSpotCompanyByOwnerEmail(
      updatedInvitation.org.owner.email,
    );
    await createHubSpotContact(
      {
        email: updatedInvitation.email,
        firstname: updatedInvitation.name,
        company: updatedInvitation.org.name,
        joined_date: updatedInvitation.createdAt,
      },
      companyId,
    );
  } else {
    //for existing user
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
    } else {
      if (orgMember && updatedInvitation.teamId) {
        createTeamMemberIfNotExists(updatedInvitation.teamId, user.id);
      }
    }

    redirectLink = `${process.env.FRONTEND_URL}/login}`;
  }

  return { ...updatedInvitation, isUser: isUser, redirectLink };
}

async function createTeamMemberIfNotExists(teamId: string, userId: string) {
  // Fetch the record with the same teamId and userId
  const existingTeamMember = await prisma.teamMember.findFirst({
    where: {
      teamId: teamId,
      userId: userId,
    },
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
  } else {
    throw new Error("Team member Record already exists");
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
          email: true,
          name: true,
        },
      },
    },
  });
}

export async function getUsersNotInTeam(teamId: string, orgId: string) {
  return prisma.$queryRawUnsafe<
    {
      id: string;
      name: string | null;
      email: string;
      role: string;
      profilePhoto: string | null;
    }[]
  >(
    `
    SELECT 
      u.id,
      u.name,
      u.email,
      u."profilePhoto",
      om.role
    FROM "User" u
    INNER JOIN "OrgMember" om ON om."userId" = u.id
    WHERE om."orgId" = $1
      AND u.id NOT IN (
        SELECT "userId"
        FROM "TeamMember"
        WHERE "teamId" = $2
      )
    ORDER BY u.name ASC;
  `,
    orgId,
    teamId,
  );
}

export async function getTeamMembersAndFromInvitation(
  orgId: string,
  input: GetTeamMembersInput,
) {
  const team = await prisma.team.findUnique({
    where: {
      id: input.teamId,
    },
    select: {
      id: true,
      name: true,
      googleLink: true,
      code: true,
      tags: true,
      invitations: {
        where: {
          status: {
            not: "ACCEPTED",
          },
        },
      },
      members: {
        where: {
          user: {
            active: true,
          },
        },
        select: {
          teamId: true,
          userId: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePhoto: true,
              active: true,
              orgMember: {
                where: {
                  orgId: { equals: orgId },
                },
                select: {
                  role: true,
                  userId: true,
                },
              },
            },
          },
        },
      },
    },
  });
  return {
    teamId: team.id,
    teamName: team.name,
    googleLink: team.googleLink,
    code: team.code,
    tags: team.tags,
    members: team.members.map((member) => {
      return {
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        active: member.user.active,
        role: member.user.orgMember[0].role,
        userId: member.user.orgMember[0].userId,
        profilePhoto: member.user.profilePhoto,
      };
    }),
    invitations: team.invitations.map((invite) => {
      return {
        id: invite.id,
        email: invite.email,
        name: invite.name,
        status: invite.status,
        type: invite.type,
        invitedBy: invite.invitedBy,
      };
    }),
  };
}

export async function deleteMemberInvite(id: string) {
  const invitation = await prisma.invitation.delete({
    where: {
      id,
    },
  });

  invitation &&
    (await prisma.usageStats.update({
      where: { orgId: invitation.orgId },
      data: { teamMembersCount: { decrement: 1 } },
    }));

  return invitation;
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
          code: true,
          color: true,
          createdAt: true,
          googleLink: true,
          reviewPageLinks: true,
          _count: {
            select: {
              members: {
                where: {
                  user: {
                    active: true,
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return teams.map(({ team }) => team);
}

export async function getTeamIdsByUserId(userId: string) {
  const teams = await prisma.teamMember.findMany({
    where: {
      userId,
    },
    select: {
      teamId: true,
    },
  });

  return teams.map(({ teamId }) => teamId) || [];
}
export async function getTeamIdsBySurveyMapId(mapId: string[]) {
  const teams = await prisma.surveyTeamMap.findMany({
    where: {
      id: {
        in: mapId,
      },
    },
    select: {
      teamId: true,
    },
  });

  return teams.map(({ teamId }) => teamId);
}
export async function editTeam(
  { name, code, googleLink, reviewPageLinks, color }: EditTeamInput,
  params: IdParamInput,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (name?.length < 3) {
    throw new Error("Invalid team name.");
  }
  if (code?.length < 2) {
    throw new Error("Invalid team code.");
  }
  try {
    const team = await prisma.team.update({
      where: { id: params.id },
      data: {
        name,
        code,
        googleLink,
        reviewPageLinks,
        color,
      },
    });
    return team;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        throw new Error("Team with same name or code already exists");
      }
    }
  }
}

export async function manageTags(
  { tags }: EditTeamInput,
  params: IdParamInput,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const team = await prisma.team.update({
    where: { id: params.id },
    data: {
      tags,
    },
  });
  return team;
}
export async function getTeamById(teamId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
  });

  return team;
}

export async function deleteTeamMember(teamId, userId, orgId) {
  const org = await prisma.org.findUnique({
    where: {
      id: orgId,
    },
    select: {
      ownerId: true,
    },
  });
  if (org.ownerId === userId) {
    throw Error("You can't remove Owner from team");
  }
  await prisma.teamMember.deleteMany({
    where: {
      teamId,
      userId,
    },
  });
}

export async function addMemberToTeams(teamIds, userId) {
  await prisma.teamMember.createMany({
    data: teamIds.map((teamId) => ({
      teamId,
      userId,
    })),
    skipDuplicates: true,
  });
}

export async function addMembersToTeamsMail(email, teamName, user) {
  const invitedPerson = await prisma.orgMember.findFirst({
    where: {
      userId: user.id,
      orgId: user.orgId,
    },
    select: {
      user: {
        select: {
          name: true,
        },
      },
      org: {
        select: {
          name: true,
        },
      },
    },
  });
  const msg = {
    to: email,
    subject: `You have been added to the team ${teamName} - RateUp.app`,
    text: `You have been added to manage a Team in RateUp by ${invitedPerson.org.name}`,
    html: getEmailBodyTemplate("GeneralTemplate", {
      body: `
      <p>You have been added to manage a Team in RateUp by ${invitedPerson.org.name}</p>
      Explore features of new team by visiting RateUp. You can switch between teams to view the team wise details
      `,
      buttonLink: `${process.env.FRONTEND_URL}/dashboard`,
    }),
  };
  try {
    sendAWSEmail(msg);
  } catch (error) {
    console.error(error);
    throw new Error("Email sending failed. E:" + error);
  }
}
