-- `addToken` deduplicates with a findFirst followed by a create, which is a
-- read-then-write race: two concurrent registrations of the same device both see
-- no row and both insert. The unique index below closes it, but it cannot be
-- created while duplicates already exist — so collapse them first, keeping the
-- earliest row of each group so `createdAt` still reflects when the device was
-- first seen.
DELETE FROM "ExpoPushToken" a
USING "ExpoPushToken" b
WHERE a."expoToken" = b."expoToken"
  AND a."userId" = b."userId"
  AND a."orgId" = b."orgId"
  AND (a."createdAt", a."id") > (b."createdAt", b."id");

-- CreateIndex
CREATE UNIQUE INDEX "ExpoPushToken_expoToken_userId_orgId_key"
  ON "ExpoPushToken"("expoToken", "userId", "orgId");
