-- CreateTable
CREATE TABLE "NLP_Cache" (
    "text" TEXT NOT NULL,
    "result" JSONB NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "NLP_Cache_text_key" ON "NLP_Cache"("text");
