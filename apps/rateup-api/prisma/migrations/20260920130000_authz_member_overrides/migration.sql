-- Authz: per-member permission overrides on top of the role.

-- AlterTable
ALTER TABLE "OrgMember" ADD COLUMN "permissionGrants" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "permissionDenies" TEXT[] DEFAULT ARRAY[]::TEXT[];
