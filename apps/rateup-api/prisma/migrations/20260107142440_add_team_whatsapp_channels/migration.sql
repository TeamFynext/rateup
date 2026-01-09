-- CreateTable
CREATE TABLE "_TeamToWhatsappSettings" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_TeamToWhatsappSettings_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_TeamToWhatsappSettings_B_index" ON "_TeamToWhatsappSettings"("B");

-- AddForeignKey
ALTER TABLE "_TeamToWhatsappSettings" ADD CONSTRAINT "_TeamToWhatsappSettings_A_fkey" FOREIGN KEY ("A") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TeamToWhatsappSettings" ADD CONSTRAINT "_TeamToWhatsappSettings_B_fkey" FOREIGN KEY ("B") REFERENCES "WhatsappSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
