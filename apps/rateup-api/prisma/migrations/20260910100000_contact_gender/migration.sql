-- A contact's gender, captured optionally when staff enrol a customer at the counter.
-- Reuses the existing "Gender" enum (MALE / FEMALE / OTHER) that User already carries.
ALTER TABLE "Contact" ADD COLUMN "gender" "Gender";
