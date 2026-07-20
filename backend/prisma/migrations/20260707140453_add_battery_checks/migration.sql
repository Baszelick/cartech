-- CreateTable
CREATE TABLE "BatteryCheck" (
    "id" SERIAL NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voltage" DOUBLE PRECISION,
    "comment" TEXT,
    "carId" INTEGER NOT NULL,

    CONSTRAINT "BatteryCheck_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BatteryCheck" ADD CONSTRAINT "BatteryCheck_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
