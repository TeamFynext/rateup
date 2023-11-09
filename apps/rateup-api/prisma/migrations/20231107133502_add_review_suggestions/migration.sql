-- CreateTable
CREATE TABLE "ReviewSuggestion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "teamId" UUID NOT NULL,
    "review" TEXT NOT NULL,

    CONSTRAINT "ReviewSuggestion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ReviewSuggestion" ADD CONSTRAINT "ReviewSuggestion_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
