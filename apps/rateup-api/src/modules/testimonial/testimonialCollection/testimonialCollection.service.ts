import prisma from "../../../utils/prisma.js";
import {
  CreateTestimonialCollectionInput,
  UpdateTestimonialCollectionInput,
} from "./testimonialCollection.schema.js";

export async function createTestimonialCollection(
  testimonialCollection: CreateTestimonialCollectionInput,
) {
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
) {
  if (testimonialCollection?.testimonialIds?.length) {
    await prisma.testimonialCollectionMap.deleteMany({
      where: {
        collectionId,
      },
    });
    await prisma.testimonialCollectionMap.createMany({
      data: testimonialCollection?.testimonialIds?.map((t) => ({
        testimonialId: t,
        collectionId,
      })),
    });
  }
  const collection = await prisma.testimonialCollection.update({
    where: {
      id: collectionId,
    },
    data: {
      name: testimonialCollection?.name,
      theme: testimonialCollection?.theme,
    },
  });
  return collection;
}

export async function getTestimonialCollectionById(collectionId: string) {
  const collection = await prisma.testimonialCollection.findUnique({
    where: {
      id: collectionId,
    },
    include: {
      testimonials: {
        select: {
          testimonial: true,
        },
      },
    },
  });

  return {
    ...collection,
    testimonials: collection?.testimonials.map((t) => t.testimonial),
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
export async function getTestimonialCollectionsByTeamId(teamId: string) {
  const collection = await prisma.testimonialCollection.findMany({
    where: {
      teamId,
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

export async function deleteTestimonialCollection(collectionId: string) {
  return await prisma.testimonialCollection.delete({
    where: {
      id: collectionId,
    },
  });
}

//all the servies listed below are for managing multiple testimonials to a collection

export async function addMultipleTestimonialToCollection(
  collectionId: string,
  testimonialIds: string[],
) {
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
) {
  return await prisma.testimonialCollectionMap.deleteMany({
    where: {
      collectionId,
      testimonialId: {
        in: testimonialIds,
      },
    },
  });
}
