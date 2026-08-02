-- Full VIN is optional. PostgreSQL composite UNIQUE allows multiple NULL VINs,
-- while preserving uniqueness for non-null VINs inside each company.
ALTER TABLE "cars"
ALTER COLUMN "vin" DROP NOT NULL;
