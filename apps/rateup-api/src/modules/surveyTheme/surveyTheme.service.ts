import prisma from "../../utils/prisma.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { defaultTheme } from "./defaultTheme.js";

// The services below are handed the Fastify request, but only ever read these
// fields — typing them structurally keeps both the route handlers and the unit
// tests (which pass plain objects) assignable.
interface WithUser {
  user?: { orgId?: string };
}

export interface ThemeIdParams {
  webSurveyThemeId: string;
}

export type CreateThemeRequest = WithUser & {
  body: { themeName: string; surveyId?: string };
};

export interface RenameThemeRequest extends WithUser {
  params: ThemeIdParams;
  body: { name?: string };
}

export interface UpdateActiveThemeRequest extends WithUser {
  params: ThemeIdParams;
  body: { surveyId: string; theme: Prisma.InputJsonValue };
}

/** Raised when a theme or survey named in a request is not the caller's. */
export class ThemeAccessError extends Error {
  readonly status: 403 | 404;

  constructor(message: string, status: 403 | 404) {
    super(message);
    this.name = "ThemeAccessError";
    this.status = status;
  }
}

function requireOrgId(req: WithUser) {
  const orgId = req?.user?.orgId;
  if (!orgId) {
    throw new ThemeAccessError("No organisation on the session", 403);
  }
  return orgId;
}

async function assertSurveyIsTheOrgs(surveyId: string, orgId: string) {
  const survey = await prisma.survey.findFirst({
    where: {
      id: surveyId,
      OR: [{ orgId }, { teams: { some: { team: { orgId } } } }],
    },
    select: { id: true },
  });
  if (!survey) {
    throw new ThemeAccessError("Survey not found", 404);
  }
}

export async function getSurveyThemeById(webSurveyThemeId: string) {
  return await prisma.webSurveyTheme.findUnique({
    where: {
      id: webSurveyThemeId,
    },
  });
}

export async function getAllThemesOfUserOrgFromDB(req: WithUser) {
  const { orgId } = req?.user || {};
  return await prisma.webSurveyTheme.findMany({
    where: {
      orgId,
    },
    select: {
      name: true,
      id: true,
      theme: true,
      survey: {
        select: { title: true },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function createAndApplyThemeToSurvey(req: CreateThemeRequest) {
  const orgId = requireOrgId(req);
  const { themeName } = req.body;
  const surveyId = req.body.surveyId;

  if (surveyId) {
    await assertSurveyIsTheOrgs(surveyId, orgId);
  }

  return prisma.$transaction(async (tx) => {
    const newTheme = await tx.webSurveyTheme.create({
      data: {
        orgId,
        name: themeName,
        theme: defaultTheme,
      },
    });
    if (surveyId) {
      await tx.survey.update({
        where: {
          id: surveyId,
        },
        data: {
          webSurveyThemeId: newTheme.id,
        },
      });
    }

    return newTheme;
  });
}

export async function renameThemeInDB(req: RenameThemeRequest) {
  const orgId = requireOrgId(req);
  const { webSurveyThemeId } = req.params;

  const updatedTheme = await prisma.webSurveyTheme.update({
    where: {
      id: webSurveyThemeId,
      // Selecting by id alone made this a write to any org's row — and renaming
      // was also the way past the other endpoint's only guard, which compares
      // the theme's display name to the literal "Default Theme".
      orgId,
    },
    data: {
      name: req.body.name,
    },
  });
  return updatedTheme;
}

export async function updateSurveyThemeActiveSurveyThemeInDB(req: UpdateActiveThemeRequest) {
  const orgId = requireOrgId(req);
  const { webSurveyThemeId } = req.params;
  const { surveyId, theme } = req.body;

  const themeObj = await prisma.webSurveyTheme.findFirst({
    where: {
      id: webSurveyThemeId,
      orgId,
    },
    select: {
      name: true,
    },
  });
  if (!themeObj) {
    throw new ThemeAccessError("Theme not found", 404);
  }
  await assertSurveyIsTheOrgs(surveyId, orgId);

  // The theme write and the survey repoint used to be two separate statements,
  // so a failure between them left the survey pointing at a theme that had not
  // been updated.
  const updatedTheme = await prisma.$transaction(async (tx) => {
    let written = null;
    if (themeObj.name !== "Default Theme") {
      written = await tx.webSurveyTheme.update({
        where: {
          id: webSurveyThemeId,
          orgId,
        },
        data: {
          theme,
        },
      });
    }

    await tx.survey.update({
      where: {
        id: surveyId,
      },
      data: {
        webSurveyThemeId,
      },
    });

    return written;
  });

  if (updatedTheme) {
    return updatedTheme;
  } else {
    return {
      success: true,
      message: "Applied theme succesfully.",
    };
  }
}

export async function deleteThemeInDB(req: WithUser & { params: ThemeIdParams }) {
  const orgId = requireOrgId(req);
  const { webSurveyThemeId } = req.params;
  const deletedTheme = await prisma.webSurveyTheme.delete({
    where: {
      id: webSurveyThemeId,
      orgId,
    },
  });
  return deletedTheme;
}
