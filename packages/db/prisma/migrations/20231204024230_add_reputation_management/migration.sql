-- CreateTable
CREATE TABLE "Review" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "review" TEXT,
    "title" TEXT,
    "rating" INTEGER,
    "platform" TEXT NOT NULL,
    "teamId" UUID NOT NULL,
    "meta" JSONB,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewAnalysis" (
    "reviewId" UUID NOT NULL,
    "entities" JSONB[],
    "sentences" JSONB[],
    "sentiment" DOUBLE PRECISION NOT NULL
);

-- CreateTable
CREATE TABLE "RM_Topic" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "keywords" TEXT[],
    "teamId" UUID NOT NULL,

    CONSTRAINT "RM_Topic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewAnalysis_reviewId_key" ON "ReviewAnalysis"("reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "RM_Topic_name_teamId_key" ON "RM_Topic"("name", "teamId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAnalysis" ADD CONSTRAINT "ReviewAnalysis_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RM_Topic" ADD CONSTRAINT "RM_Topic_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
