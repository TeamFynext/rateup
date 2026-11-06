-- CreateTable
CREATE TABLE "MenuBanner" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT,
    "videoUrl" TEXT,
    "price" JSONB NOT NULL,
    "menuId" UUID NOT NULL,

    CONSTRAINT "MenuBanner_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MenuBanner" ADD CONSTRAINT "MenuBanner_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;
