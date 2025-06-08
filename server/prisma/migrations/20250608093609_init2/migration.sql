/*
  Warnings:

  - You are about to drop the column `environment` on the `Hotel` table. All the data in the column will be lost.
  - You are about to drop the column `ohipBaseUrl` on the `Hotel` table. All the data in the column will be lost.
  - You are about to drop the column `ohipClientId` on the `Hotel` table. All the data in the column will be lost.
  - You are about to drop the column `ohipClientSecret` on the `Hotel` table. All the data in the column will be lost.
  - You are about to drop the column `propertyCode` on the `Hotel` table. All the data in the column will be lost.
  - You are about to drop the column `scopes` on the `Hotel` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Admin" DROP CONSTRAINT "Admin_hotelId_fkey";

-- AlterTable
ALTER TABLE "Admin" ALTER COLUMN "hotelId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Hotel" DROP COLUMN "environment",
DROP COLUMN "ohipBaseUrl",
DROP COLUMN "ohipClientId",
DROP COLUMN "ohipClientSecret",
DROP COLUMN "propertyCode",
DROP COLUMN "scopes";

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
