import prisma from "../../../utils/prisma.js";
import {
  CreateTestimonialCollectionInput,
  UpdateTestimonialCollectionInput,
} from "./testimonialCollection.schema.js";

export class CollectionAccessError extends Error {
  readonly status: 403 | 404;

  constructor(message: string, status: 403 | 404) {
    super(message);
    this.name = "CollectionAccessError";
    this.status = status;
  }
}

/**
 * TestimonialCollection has no orgId of its own — it hangs off a Team, which is
 * where the org lives. Every entry point that takes a collection id from the
 * request resolves it through that relation before touching anything.
 */
async function assertCollectionIsTheOrgs(collectionId: string, orgId: string) {
  const collection = await prisma.testimonialCollection.findFirst({
    where: { id: collectionId, team: { orgId } },
    select: { id: true },
  });
  if (!collection) {
    throw new CollectionAccessError("Collection not found", 404);
  }
}

async function assertTeamIsTheOrgs(teamId: string, orgId: string) {
  const team = await prisma.team.findFirst({ where: { id: teamId, orgId }, select: { id: true } });
  if (!team) {
    throw new CollectionAccessError("Team not found", 404);
  }
}

async function assertTestimonialsAreTheOrgs(testimonialIds: string[], orgId: string) {
  const wanted = [...new Set(testimonialIds)];
  if (!wanted.length) return;

  const owned = await prisma.testimonial.findMany({
    where: {
      id: { in: wanted },
      surveyResponse: { surveyTeamMap: { team: { orgId } } },
    },
    select: { id: true },
  });
  if (owned.length !== wanted.length) {
    throw new CollectionAccessError(
      "One or more testimonials do not belong to your organisation",
      403,
    );
  }
}

export async function createTestimonialCollection(
  testimonialCollection: CreateTestimonialCollectionInput,
  orgId: string,
) {
  await assertTeamIsTheOrgs(testimonialCollection.teamId, orgId);

  const collection = await prisma.testimonialCollection.create({
    data: {
      name: testimonialCollection.name,
      teamId: testimonialCollection.teamId,
      theme: testimonialCollection.theme,
    },
  });
  return collection;
}

export async function updateTestimonialCollection(
  testimonialCollection: UpdateTestimonialCollectionInput,
  collectionId: string,
  orgId: string,
) {
  await assertCollectionIsTheOrgs(collectionId, orgId);

  const { testimonialIds } = testimonialCollection;
  if (testimonialIds) {
    await assertTestimonialsAreTheOrgs(testimonialIds, orgId);
  }

  const collection = await prisma.$transaction(async (tx) => {
    if (testimonialIds) {
      await tx.testimonialCollectionMap.deleteMany({ where: { collectionId } });
      if (testimonialIds.length) {
        await tx.testimonialCollectionMap.createMany({
          data: testimonialIds.map((t) => ({ testimonialId: t, collectionId })),
        });
      }
    }
    return tx.testimonialCollection.update({
      where: { id: collectionId, team: { orgId } },
      data: {
        name: testimonialCollection?.name,
        theme: testimonialCollection?.theme,
      },
    });
  });
  return collection;
}

export async function getTestimonialCollectionById(collectionId: string) {
  const collection = await prisma.testimonialCollection.findUnique({
    where: {
      id: collectionId,
    },
    select: {
      id: true,
      name: true,
      theme: true,
      testimonials: {
        select: {
          testimonial: true,
        },
      },
    },
  });

  if (!collection) return null;

  return {
    ...collection,
    testimonials: collection.testimonials.map((t) => t.testimonial),
  };
}

export async function getCollectionsByOrgId(orgId: string) {
  const collections = await prisma.testimonialCollection.findMany({
    where: {
      team: {
        orgId,
      },
    },
    include: {
      _count: {
        select: {
          testimonials: true,
        },
      },
    },
  });
  return collections;
}

export async function getTestimonialCollectionsByTeamId(teamId: string, orgId: string) {
  const collection = await prisma.testimonialCollection.findMany({
    where: {
      teamId,
      team: {
        orgId,
      },
    },
    include: {
      _count: {
        select: {
          testimonials: true,
        },
      },
    },
  });
  return collection;
}

export async function deleteTestimonialCollection(collectionId: string, orgId: string) {
  return await prisma.testimonialCollection.delete({
    where: {
      id: collectionId,
      team: { orgId },
    },
  });
}

//all the servies listed below are for managing multiple testimonials to a collection

export async function addMultipleTestimonialToCollection(
  collectionId: string,
  testimonialIds: string[],
  orgId: string,
) {
  await assertCollectionIsTheOrgs(collectionId, orgId);
  await assertTestimonialsAreTheOrgs(testimonialIds, orgId);

  const existingTestimonials = await prisma.testimonialCollectionMap.findMany({
    where: {
      collectionId,
    },
    select: {
      testimonialId: true,
    },
  });
  const exitsingTestimonialIds = existingTestimonials.map((t) => t.testimonialId);
  const newTestimonialIds = testimonialIds.filter((t) => !exitsingTestimonialIds.includes(t));
  const collectionmap = newTestimonialIds.map((c) => ({
    testimonialId: c,
    collectionId,
  }));
  return await prisma.testimonialCollectionMap.createMany({
    data: collectionmap,
  });
}

export async function deleteMultipleTestimonialFromCollection(
  collectionId: string,
  testimonialIds: string[],
  orgId: string,
) {
  await assertCollectionIsTheOrgs(collectionId, orgId);

  return await prisma.testimonialCollectionMap.deleteMany({
    where: {
      collectionId,
      testimonialId: {
        in: testimonialIds,
      },
    },
  });
}
