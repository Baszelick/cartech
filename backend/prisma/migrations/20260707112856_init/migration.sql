-- CreateEnum
CREATE TYPE "CarStatus" AS ENUM ('STOCK', 'ISSUED');

-- CreateTable
CREATE TABLE "Car" (
    "id" SERIAL NOT NULL,
    "vin" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "arrivalDate" TIMESTAMP(3) NOT NULL,
    "status" "CarStatus" NOT NULL DEFAULT 'STOCK',
    "psoCompletedAt" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Car_pkey" PRIMARY KEY ("id")
);
