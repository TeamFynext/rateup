-- CreateTable
CREATE TABLE "Testimonial" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "testimonial" JSONB NOT NULL,
    "responseId" UUID NOT NULL,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestimonialCollection" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "teamId" UUID NOT NULL,
    "theme" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestimonialCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestimonialCollectionMap" (
    "testimonialId" UUID NOT NULL,
    "collectionId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestimonialCollectionMap_pkey" PRIMARY KEY ("testimonialId","collectionId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Testimonial_testimonial_responseId_key" ON "Testimonial"("testimonial", "responseId");

-- CreateIndex
CREATE UNIQUE INDEX "TestimonialCollection_name_teamId_key" ON "TestimonialCollection"("name", "teamId");

-- AddForeignKey
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "SurveyResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestimonialCollection" ADD CONSTRAINT "TestimonialCollection_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestimonialCollectionMap" ADD CONSTRAINT "TestimonialCollectionMap_testimonialId_fkey" FOREIGN KEY ("testimonialId") REFERENCES "Testimonial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestimonialCollectionMap" ADD CONSTRAINT "TestimonialCollectionMap_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "TestimonialCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
