import prisma from "../../../utils/prisma.js";
import {
  CreateTestimonialCollectionInput,
  UpdateTestimonialCollectionInput,
} from "./testimonialCollection.schema.js";

/**
 * Raised when a collection, a team or a testimonial named in a request does not
 * belong to the caller's organisation. See issues.txt 31.1, 31.2, 31.3.
 */
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

/**
 * Testimonials reach an org through SurveyResponse -> SurveyTeamMap -> Team, the
 * same join the by-org listing in testimonial.service.ts uses. A collection may
 * only hold testimonials the caller's own organisation collected — without this
 * an attacker could republish another org's respondent-authored content at the
 * public widget URL. See issues.txt 31.1.
 */
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
  // teamId is a body field, so without this a user could plant a collection
  // inside any team on the platform. See issues.txt 31.3.
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

  // The three writes used to run unwrapped, so a failure between the clear and
  // the rewrite left the published widget with no testimonials at all and
  // nothing recording what it had held. The guard was also `?.length`, which
  // made an empty array indistinguishable from an omitted one — there was no
  // way to empty a collection through this endpoint. `!== undefined` is the
  // distinction: an explicit [] clears. See issues.txt 31.5.
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

/**
 * The public widget read (/api/public/testimonials/:id) — deliberately
 * unauthenticated, since a collection is embedded on the customer's own site.
 *
 * Returns null rather than a spread of null for a miss: `{ ...collection }` over
 * null yielded `{}`, a truthy object the handler answered 200 for, so a deleted
 * collection rendered as an empty wall instead of failing visibly and every id
 * probed returned 200. The projection also drops teamId, which used to travel to
 * every visitor of the embedding page. See issues.txt 31.4.
 */
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
      // Naming a team in the query string used to take this branch, which
      // filtered on teamId alone — so the org-scoped listing beside it was
      // opt-out. See issues.txt 31.3.
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
  // A miss — a foreign collection or none — raises P2025, which the handler
  // answers 404 for. See issues.txt 31.2.
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
  // Neither side of the join used to be resolved to an owner, which made this
  // the write half of "republish another org's testimonials at a public URL".
  // See issues.txt 31.1.
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
  // The destructive direction of the same hole: without this, a collection id
  // was enough to empty another org's live widget. See issues.txt 31.1.
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
