-- CreateTable
CREATE TABLE "MenuLanding" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "headerText" TEXT,
    "headerStyle" JSONB,
    "titleStyle" JSONB,
    "otherStyle" JSONB,
    "logoStyles" JSONB,
    "backgroundImage" TEXT,
    "menuPageEnabled" BOOLEAN NOT NULL DEFAULT true,
    "feedbackPageEnabled" BOOLEAN NOT NULL DEFAULT true,
    "menuId" UUID NOT NULL,

    CONSTRAINT "MenuLanding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MenuLanding_menuId_key" ON "MenuLanding"("menuId");

-- AddForeignKey
ALTER TABLE "MenuLanding" ADD CONSTRAINT "MenuLanding_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;
