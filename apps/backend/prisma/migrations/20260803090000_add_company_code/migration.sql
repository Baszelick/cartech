-- Add Company.code without deleting or recreating existing company data.
ALTER TABLE "companies" ADD COLUMN "code" TEXT;

-- Existing rows receive deterministic, format-valid and globally unique codes.
WITH "ranked_companies" AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (ORDER BY "id") AS "sequence"
  FROM "companies"
)
UPDATE "companies" AS "company"
SET "code" = 'LEGACY_' || LPAD("ranked"."sequence"::TEXT, 10, '0')
FROM "ranked_companies" AS "ranked"
WHERE "company"."id" = "ranked"."id";

ALTER TABLE "companies" ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX "companies_code_key" ON "companies"("code");
