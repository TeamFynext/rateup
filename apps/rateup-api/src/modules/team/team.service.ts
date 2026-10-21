import crypto from "node:crypto";
import supertokens from "supertokens-node";
import { getOrgChannelIds } from "../channel/channel.service.js";
import prisma from "../../utils/prisma.js";
import { assertSeatAvailable } from "./team.limits.js";
import { createUser, getUserRecipeName } from "../user/user.service.js";
import {
  CreateTeamInput,
  EditTeamInput,
  GetTeamMembersInput,
  GetTeamsByOrgInput,
  IdParamInput,
  InviteMemberInput,
  SetTeamChannelsInput,
} from "./team.schema.js";
import { log } from "../../utils/logger.js";
import { invalidateChannelAccessCache } from "../whatsapp/settings/wa_channel_access.js";
import { bustActor, bustActorsForOrg, bustActorsForUser } from "../../authz/actor.js";
import { ForbiddenError } from "../../authz/errors.js";
import {
  DEFAULT_INVITED_ROLE,
  legacyRoleToKey,
  roleKeyToLegacy,
  type LegacyRole,
} from "../../authz/roles.js";
import EmailVerification from "supertokens-node/recipe/emailverification/index.js";
import { createEmailBody } from "../../utils/email/supertoken/inviteEmail.js";
import { sendResetPasswordMail } from "../../utils/email/supertoken/passwordReset.js";
import { Role } from "../../../generated/prisma/client.js";

import EmailPassword from "supertokens-node/recipe/emailpassword/index.js";

import { FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "../../../generated/prisma/client.js";
import { createHubSpotContact, getHubSpotCompanyByOwnerEmail } from "../../utils/hubspot.js";

import { getEmailBodyTemplate } from "../email/email.util.js";
import { sendTransactionalEmail, notificationQueue } from "../../workers/bullmq/queues/index.js";

export async function createTeam(input: CreateTeamInput) {
  if (input.name.length < 3) {
    throw new Error("Invalid team name.");
  }

  if (!input.code || input.code.length < 2) {
    throw new Error("Invalid team code.");
  }
  const code = input.code;

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
            code: code.trim(),
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

    if (result) {
      await prisma.usageStats.update({
        where: { orgId: input.orgId },
        data: { teamsCount: { increment: 1 } },
      });
    }

    return result;
  } catch (error) {
    // Rollback the transaction
    console.error("Transaction rolled back:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export function getTeamsByOrgId(input: GetTeamsByOrgInput, page?: number) {
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

export async function deleteTeamById(id: string, orgId: string) {
  // Bound to the caller's org: a team id from another org reads as not found.
  const owned = await prisma.team.findFirst({ where: { id, orgId }, select: { id: true } });
  if (!owned) return null;
  const team = await prisma.team.delete({
    where: {
      id,
    },
  });

  if (team) {
    await prisma.usageStats.update({
      where: { orgId: team.orgId },
      data: { teamsCount: { decrement: 1 } },
    });
    await bustActorsForOrg(team.orgId);
  }
  return team;
}

/** How long an invitation link works after it is issued (or re-issued by a resend). */
export const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Invitation links carry a random token, never the invitation's id: the id is listed to
 * anyone who can see the members page, and it used to be the whole credential. Only the
 * token's SHA-256 is stored, so the table cannot be read back into working links.
 */
export function hashInviteToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function issueInviteToken() {
  const token = crypto.randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashInviteToken(token),
    tokenExpiresAt: new Date(Date.now() + INVITE_TTL_MS),
  };
}

function inviteLink(token: string) {
  return `${process.env.FRONTEND_URL}/invite?type=team&token=${token}`;
}

/** The link is no good: unknown, already used, withdrawn or expired. One message for all. */
export class InvalidInviteError extends Error {
  constructor() {
    super("This invitation is invalid or has expired.");
    this.name = "InvalidInviteError";
  }
}

function isExpired(invitation: { tokenExpiresAt: Date | null }) {
  return !invitation.tokenExpiresAt || invitation.tokenExpiresAt.getTime() <= Date.now();
}

//used in zapier controller also
/** An invitation with the fields the route handler resolves from the session. */
export type ResolvedInviteInput = InviteMemberInput & { orgId: string; invitedBy: string };

export async function inviteTeamMember(input: ResolvedInviteInput) {
  if (input.name.length < 2) {
    throw new Error("Invalid name.");
  }

  // Checked here as well as on the route: the Zapier integration invites through this
  // function directly, so a seat limit enforced only in a preHandler would not exist for
  // it. See assertSeatAvailable.
  await assertSeatAvailable(input.orgId);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (input.email.length < 6 || !emailRegex.test(input.email)) {
    throw new Error("Invalid email. Please enter a valid email address.");
  }
  try {
    const { email, name, orgId, teamId, invitedBy, type, role } = input;

    // Every team this invitation grants; `teamId` is the one it is filed under and is
    // always included.
    const inviteTeamIds = [...new Set([...(input.teamIds ?? []), ...(teamId ? [teamId] : [])])];
    // Every team named must be the inviting org's: otherwise accepting would put the invitee
    // into another tenant's team.
    if (inviteTeamIds.length) await assertTeamsBelongToOrg(inviteTeamIds, orgId);

    // Check if team member with the input email already exists
    const existingTeamMember = inviteTeamIds.length
      ? await prisma.teamMember.findFirst({
          where: {
            user: {
              email,
            },
            teamId: {
              in: inviteTeamIds,
            },
          },
        })
      : null;

    if (existingTeamMember) {
      throw new Error("Team member with the provided email already exists in the team.");
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
        const joinedTeams = await addUserToTeams(inviteTeamIds, memberOfGroup.userId, orgId);
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
        if (!invitedPerson) {
          throw new Error("Inviting org member not found.");
        }
        // The mail names what they were added to — the org itself when no team was picked.
        const teamNames = joinedTeams.map((team) => team.name).join(", ");
        const addedTo = teamNames || invitedPerson.org.name;
        const msg = {
          to: email,
          subject: teamNames
            ? `${invitedPerson.user.name} added you to ${teamNames} - RateUp.app`
            : `${invitedPerson.user.name} added you to ${invitedPerson.org.name} - RateUp.app`,
          text: `You have been added to ${addedTo} in RateUp by ${invitedPerson.org.name}`,
          html: await getEmailBodyTemplate("GeneralTemplate", {
            title: `You've been added to ${addedTo}`,
            body: teamNames
              ? `Explore the features of your new team by visiting RateUp. You can switch between teams to view each team's details.`
              : `Explore RateUp by visiting your dashboard.`,
            buttonLink: `${process.env.FRONTEND_URL}/dashboard`,
          }),
        };
        try {
          await notificationQueue.add("notification", {
            emailData: msg,
          });
        } catch (error) {
          console.error(error);
          throw new Error("Email sending failed. E:" + error);
        }
        return { ...input, existing: true };
      }
      const belongsToAnotherOrg = existingMemberships.find((o) => o.orgId !== orgId);

      if (belongsToAnotherOrg) {
        throw new Error(
          "User with the provided email is already a member of another organization.",
        );
      }
    }

    // An invitation grants several teams, so an overlap with any of them is a collision.
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        orgId,
        OR: [
          { teamId },
          ...(inviteTeamIds.length ? [{ teamIds: { hasSome: inviteTeamIds } }] : []),
        ],
      },
    });

    const user = await prisma.user.findFirst({
      where: {
        email,
      },
    });

    if (existingInvitation) {
      if (existingInvitation.status === "PENDING" && isExpired(existingInvitation)) {
        // A lapsed invitation is replaced rather than blocking a fresh one.
        await deleteMemberInvite(existingInvitation.id, orgId);
      } else if (existingInvitation.status === "PENDING") {
        throw new Error("Invitation with the provided email is already pending.");
      } else if (existingInvitation.status === "ACCEPTED" && existingInvitation.teamId === teamId) {
        if (!user) {
          await deleteMemberInvite(existingInvitation.id, orgId);
        } else {
          throw new Error("Team member with the provided email already exists.");
        }
      }
    }

    const { token, tokenHash, tokenExpiresAt } = issueInviteToken();
    const created = await prisma.invitation.create({
      data: {
        email,
        name,
        orgId,
        teamId,
        type,
        invitedBy,
        role,
        teamIds: inviteTeamIds,
        tokenHash,
        tokenExpiresAt,
      },
    });
    // The hash never leaves the service.
    const { tokenHash: _tokenHash, ...newInvite } = created;

    if (newInvite) {
      const msg = {
        to: email, // Change to your recipient
        // from: 'hello@rateup.app', // Change to your verified sender
        subject: "Invitation to Join Team - RateUp.app",
        text: "You are invited to manage a Team in RateUp. Click on the accept to continue with the process.",
        html: await createEmailBody(inviteLink(token), email),
      };
      try {
        // Sent inline: an invitee is waiting on this link to finish onboarding.
        await sendTransactionalEmail(msg);
      } catch (error) {
        console.error(error);
        throw new Error("Email sending failed. E:" + error);
      }
    }

    console.log("Invite created successfully");

    if (newInvite) {
      await prisma.usageStats.update({
        where: { orgId: orgId },
        data: { teamMembersCount: { increment: 1 } },
      });
    }

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
export async function resendInviteTeamMember(id: string, orgId: string) {
  const existingInvitation = await prisma.invitation.findFirst({
    where: {
      id,
      orgId,
    },
  });
  if (!existingInvitation) throw new InvalidInviteError();
  if (existingInvitation.status === "PENDING") {
    // A resend issues a fresh token and a fresh expiry; the previous link stops working.
    const { token, tokenHash, tokenExpiresAt } = issueInviteToken();
    await prisma.invitation.update({
      where: { id: existingInvitation.id },
      data: { tokenHash, tokenExpiresAt },
    });
    const msg = {
      to: existingInvitation.email,
      subject: "Invitation to Join Team - RateUp.app",
      text: "You are invited to manage a Team in RateUp. Click on the accept to continue with the process.",
      html: await createEmailBody(inviteLink(token), existingInvitation.email),
    };
    // Sent inline: this is a resend triggered by someone waiting on the invite.
    await sendTransactionalEmail(msg);
  }
  return "sent";
}

/**
 * Accepts an invitation by its emailed token.
 *
 * The token must match a PENDING, unexpired invitation, and it is spent by a conditional
 * update before anything else happens, so two concurrent clicks cannot both accept it. A
 * failure part-way hands the invitation back so the invitee can try again.
 *
 * A brand-new invitee gets a SuperTokens account with a random password nobody knows, and
 * the link to set their own is emailed to the invited address rather than returned here:
 * whoever holds the invite link must not end up holding the account.
 */
export async function completeInvite(token: string) {
  const tokenHash = hashInviteToken(token);
  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash },
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

  if (!invitation || invitation.status !== "PENDING" || isExpired(invitation)) {
    throw new InvalidInviteError();
  }

  // Single use: only one caller can move it out of PENDING.
  const claimed = await prisma.invitation.updateMany({
    where: { id: invitation.id, status: "PENDING", tokenHash },
    data: { status: "ACCEPTED", tokenHash: null },
  });
  if (claimed.count !== 1) throw new InvalidInviteError();

  try {
    return await acceptInvitation(invitation);
  } catch (error) {
    await prisma.invitation.updateMany({
      where: { id: invitation.id, status: "ACCEPTED" },
      data: { status: "PENDING", tokenHash },
    });
    throw error;
  }
}

type ClaimedInvitation = Prisma.InvitationGetPayload<{
  include: {
    org: { select: { name: true; owner: { select: { email: true } } } };
    team: { select: { code: true; name: true } };
  };
}>;

async function acceptInvitation(invitation: ClaimedInvitation) {
  const loginLink = `${process.env.FRONTEND_URL}/login`;
  const result = {
    orgId: invitation.orgId,
    email: invitation.email,
    name: invitation.name,
    team: invitation.team,
    org: { name: invitation.org.name },
  };

  // find user in User table with the same email as the invitation
  const user = await prisma.user.findFirst({
    where: {
      email: invitation.email,
    },
  });

  if (user) {
    // The local row's email is not proof of ownership on its own (a phone-only sign-up
    // typed it in), so the account must actually sign in with the invited address.
    const authUser = await supertokens.getUser(user.id);
    const invited = invitation.email.toLowerCase();
    if (!authUser?.emails.some((email) => email.toLowerCase() === invited)) {
      throw new Error("The invited address is not a sign-in address of this account.");
    }

    if (!user.name) {
      await prisma.user.update({
        where: { id: user.id },
        data: { name: invitation.name },
      });
    }

    // Scoped to the inviting org. Keyed on userId alone, a user who already belonged to
    // any other org looked like an existing member here, so accepting an invite to a
    // second org silently did not add them to it.
    const orgMember = await prisma.orgMember.findFirst({
      where: { userId: user.id, orgId: invitation.orgId },
      select: {
        orgId: true,
        role: true,
      },
    });
    if (!orgMember) {
      await prisma.orgMember.create({
        data: {
          orgId: invitation.orgId,
          userId: user.id,
          ...invitedRole(invitation.role),
        },
      });
    }
    await addUserToTeams(invitedTeamIds(invitation), user.id, invitation.orgId);

    return { ...result, isUser: true, redirectLink: loginLink, passwordSetupEmailSent: false };
  }

  // A password nobody knows: the invitee sets their own through the emailed reset link.
  const unusablePassword = crypto.randomBytes(32).toString("base64url");
  const signUpResult = await EmailPassword.signUp("public", invitation.email, unusablePassword);
  if (signUpResult.status !== "OK") {
    throw new Error("User already exists");
  }
  const userId = signUpResult.user.id;

  // Opening the emailed link is what proves the address, so it is marked verified.
  const tokenRes = await EmailVerification.createEmailVerificationToken(
    "public",
    signUpResult.recipeUserId,
  );
  if (tokenRes.status === "OK") {
    await EmailVerification.verifyEmailUsingToken("public", tokenRes.token);
  }

  const recipeName = getUserRecipeName(
    signUpResult.user.loginMethods[0].recipeId,
    signUpResult.user.loginMethods[0].thirdParty?.id,
  );
  if (!recipeName) {
    throw new Error(`Unsupported auth recipe: ${signUpResult.user.loginMethods[0].recipeId}`);
  }
  const created = await createUser({ id: userId, email: invitation.email, recipeName });
  if (!created) {
    throw new Error("failed user adding");
  }
  await prisma.user.update({
    where: { id: userId },
    data: { name: invitation.name },
  });

  if (invitation.type === "TEAM") {
    await prisma.orgMember.create({
      data: {
        orgId: invitation.orgId,
        userId,
        ...invitedRole(invitation.role),
      },
    });
    await addUserToTeams(invitedTeamIds(invitation), userId, invitation.orgId);
  }

  let passwordSetupEmailSent = false;
  const linkResponse = await EmailPassword.createResetPasswordLink(
    "public",
    userId,
    invitation.email,
  );
  if (linkResponse.status === "OK") {
    const link = new URL(linkResponse.link);
    link.searchParams.set("type", "invite");
    await sendResetPasswordMail(link.toString(), invitation.email);
    passwordSetupEmailSent = true;
  } else {
    log.error({ userId }, "Could not create the password-setup link for an invitee");
  }

  const companyId = await getHubSpotCompanyByOwnerEmail(invitation.org.owner.email);
  await createHubSpotContact(
    {
      email: invitation.email,
      firstname: invitation.name,
      company: invitation.org.name,
      joined_date: invitation.createdAt,
    },
    companyId,
  );

  return { ...result, isUser: false, redirectLink: loginLink, passwordSetupEmailSent };
}

/**
 * Puts a user in every team named. An existing membership is skipped rather than thrown on,
 * so one team they are already in cannot abandon the rest. Returns the teams, for the email.
 */
/** Both spellings of the role an invitation grants; one without a role grants the default. */
function invitedRole(role: Role | null | undefined) {
  const legacy = role ?? roleKeyToLegacy(DEFAULT_INVITED_ROLE);
  return { role: legacy, roleKey: legacyRoleToKey(legacy as LegacyRole, false) };
}

/** The teams an invitation grants. Empty `teamIds` means `teamId` alone. */
function invitedTeamIds(invitation: { teamId: string | null; teamIds: string[] }) {
  if (invitation.teamIds.length) return invitation.teamIds;
  return invitation.teamId ? [invitation.teamId] : [];
}

async function addUserToTeams(teamIds: string[], userId: string, orgId: string) {
  // Only the org's own teams, whatever ids the invitation carries.
  const teams = await prisma.team.findMany({
    where: { id: { in: teamIds }, orgId },
    select: { id: true, name: true },
  });

  for (const team of teams) {
    const existing = await prisma.teamMember.findFirst({
      where: { teamId: team.id, userId },
    });

    if (!existing) {
      await prisma.teamMember.create({ data: { teamId: team.id, userId } });
    }
  }
  await bustActorsForUser(userId);

  return teams;
}

export function getTeamMembers(input: GetTeamMembersInput, orgId: string) {
  return prisma.teamMember.findMany({
    where: {
      teamId: input.teamId,
      team: { orgId },
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
      AND u.active = true
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

export async function getTeamMembersAndFromInvitation(orgId: string, input: GetTeamMembersInput) {
  const team = await prisma.team.findFirst({
    where: {
      id: input.teamId,
      orgId,
    },
    select: {
      id: true,
      name: true,
      googleLink: true,
      code: true,
      tags: true,
      // Invitations filed under this team; the query below picks up the rest.
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
              phone: true,
              createdAt: true,
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

  if (!team) {
    throw new Error("Team not found");
  }

  // Invitations that grant this team without being filed under it.
  const alsoInvited = await prisma.invitation.findMany({
    where: {
      orgId,
      status: { not: "ACCEPTED" },
      teamId: { not: input.teamId },
      teamIds: { has: input.teamId },
    },
  });

  const invitations = [...team.invitations, ...alsoInvited];

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
        role: member?.user?.orgMember?.[0]?.role,
        userId: member?.user?.orgMember?.[0]?.userId,
        profilePhoto: member.user.profilePhoto,
        phone: member.user.phone,
        createdAt: member.user.createdAt,
      };
    }),
    invitations: invitations.map((invite) => {
      return {
        id: invite.id,
        email: invite.email,
        name: invite.name,
        role: invite.role,
        status: invite.status,
        type: invite.type,
        invitedBy: invite.invitedBy,
        createdAt: invite.createdAt,
        // The id is only a handle for resend/delete; the link's token is never listed.
        expiresAt: invite.tokenExpiresAt,
      };
    }),
  };
}

export async function deleteMemberInvite(id: string, orgId: string) {
  const owned = await prisma.invitation.findFirst({ where: { id, orgId }, select: { id: true } });
  if (!owned) return null;
  const invitation = await prisma.invitation.delete({
    where: {
      id,
    },
  });

  if (invitation) {
    await prisma.usageStats.update({
      where: { orgId: invitation.orgId },
      data: { teamMembersCount: { decrement: 1 } },
    });
  }

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

/**
 * The ids of the teams `userId` is a member of inside `orgId`.
 *
 * Always pass the org: a user can belong to several orgs, and without it the result spans
 * all of them, so a session in one org would act on another org's teams (SURV-17). The
 * org-less form is kept only for the survey service's legacy fallback.
 */
export async function getTeamIdsByUserId(userId: string, orgId?: string): Promise<string[]> {
  // Prisma drops an `undefined` filter, so a missing user would match every membership.
  if (!userId) return [];
  const teams = await prisma.teamMember.findMany({
    where: {
      userId,
      ...(orgId !== undefined && { team: { orgId } }),
    },
    select: {
      teamId: true,
    },
  });

  return teams.map(({ teamId }) => teamId);
}
export async function getTeamIdsBySurveyMapId(mapId: string[], userId: string) {
  const teams = await prisma.surveyTeamMap.findMany({
    where: {
      id: {
        in: mapId,
      },
      team: {
        members: {
          some: {
            userId,
          },
        },
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
  _reply: FastifyReply,
) {
  if (name !== undefined && name.length < 3) {
    throw new Error("Invalid team name.");
  }
  if (code !== undefined && code.length < 2) {
    throw new Error("Invalid team code.");
  }
  try {
    // Bound to the caller's org; a foreign id finds no row and the update throws.
    const team = await prisma.team.update({
      where: { id: params.id, orgId: request.user.orgId },
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
  _reply: FastifyReply,
) {
  const team = await prisma.team.update({
    where: { id: params.id, orgId: request.user.orgId },
    data: {
      tags,
    },
  });
  return team;
}
/** By id; with `orgId`, only when the team is that org's. */
export async function getTeamById(teamId: string, orgId?: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId, ...(orgId && { orgId }) },
  });

  return team;
}

export async function deleteTeamMember(teamId: string, userId: string, orgId: string) {
  const org = await prisma.org.findUnique({
    where: {
      id: orgId,
    },
    select: {
      ownerId: true,
    },
  });
  if (!org) {
    throw new Error("Organization not found");
  }
  if (org.ownerId === userId) {
    throw Error("You can't remove Owner from team");
  }
  await assertTeamsBelongToOrg([teamId], orgId);
  await prisma.teamMember.deleteMany({
    where: {
      teamId,
      userId,
    },
  });
  await bustActor(userId, orgId);
}

/** The caller's org must own every team named, or the request could reach another tenant. */
async function assertTeamsBelongToOrg(teamIds: string[], orgId: string) {
  const owned = await prisma.team.count({ where: { id: { in: teamIds }, orgId } });
  if (owned !== new Set(teamIds).size) {
    throw new ForbiddenError("One of these teams is not in your organisation.", {
      reason: "scope",
    });
  }
}

export async function addMemberToTeams(teamIds: string[], userId: string, orgId: string) {
  const member = await prisma.orgMember.findUnique({
    where: { userId_orgId: { userId, orgId } },
    select: { userId: true },
  });
  if (!member) {
    throw new ForbiddenError("That user is not a member of your organisation.", {
      reason: "scope",
    });
  }
  await assertTeamsBelongToOrg(teamIds, orgId);
  await prisma.teamMember.createMany({
    data: teamIds.map((teamId) => ({
      teamId,
      userId,
    })),
    skipDuplicates: true,
  });
  await bustActorsForUser(userId);
}

export async function addMembersToTeamsMail(
  email: string,
  teamName: string,
  user: { id: string; orgId: string },
) {
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
  if (!invitedPerson) {
    throw new Error("Inviting org member not found.");
  }
  const msg = {
    to: email,
    subject: `You have been added to the team ${teamName} - RateUp.app`,
    text: `You have been added to manage a Team in RateUp by ${invitedPerson.org.name}`,
    html: await getEmailBodyTemplate("GeneralTemplate", {
      title: `You've been added to ${teamName}`,
      body: `You have been added to manage a team in RateUp by ${invitedPerson.org.name}.\n\nExplore the features of your new team by visiting RateUp. You can switch between teams to view each team's details.`,
      buttonLink: `${process.env.FRONTEND_URL}/dashboard`,
    }),
  };
  try {
    await notificationQueue.add("notification", {
      emailData: msg,
    });
  } catch (error) {
    console.error(error);
    throw new Error("Email sending failed. E:" + error);
  }
}

// ── Team Feature Access ───────────────────────────────────────────────────────

// ── Team Channel Access ───────────────────────────────────────────────────────

const teamChannelSelect = {
  id: true,
  platform: true,
  accountId: true,
  address: true,
  name: true,
  username: true,
  status: true,
} as const;

/**
 * Returns the team's channel grant. When `allChannels` is true the team reaches every channel in
 * the org and `channels` is returned empty — the grant is the flag, not a list of ids.
 */
export async function getTeamChannels(teamId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      allChannels: true,
      channelGrants: {
        select: { channel: { select: teamChannelSelect } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!team) return { allChannels: true, channels: [] };
  return {
    allChannels: team.allChannels,
    channels: team.allChannels ? [] : team.channelGrants.map((grant) => grant.channel),
  };
}

/**
 * Replaces the team's channel grant.
 *
 * Setting `allChannels` also clears any explicit grants, so the two representations can never
 * disagree — a later read of `channelGrants` is meaningless while the flag is on.
 * `channelIds` are Channel ids of any platform, scoped to the team's own org so a caller cannot
 * grant another tenant's channel.
 */
export async function setTeamChannels(teamId: string, input: SetTeamChannelsInput, orgId: string) {
  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { orgId: true } });
  // Another org's team reads as missing.
  if (!team || team.orgId !== orgId) throw new Error("Team not found");

  const channelIds = input.allChannels ? [] : await getOrgChannelIds(team.orgId, input.channelIds);

  // Replace the whole grant set atomically. Scoped to this team's rows only, so two admins
  // editing different teams never contend.
  await prisma.$transaction([
    prisma.team.update({ where: { id: teamId }, data: { allChannels: input.allChannels } }),
    prisma.teamChannel.deleteMany({
      where: { teamId, ...(channelIds.length > 0 && { channelId: { notIn: channelIds } }) },
    }),
    prisma.teamChannel.createMany({
      data: channelIds.map((channelId) => ({ teamId, channelId })),
      skipDuplicates: true,
    }),
  ]);

  // Cached scopes are keyed by org, and this write can widen or narrow any member's access.
  invalidateChannelAccessCache(team.orgId);

  return getTeamChannels(teamId);
}
