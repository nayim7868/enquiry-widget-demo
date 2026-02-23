/*
  Warnings:

  - The `status` column on the `Enquiry` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `priority` column on the `Enquiry` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `queue` column on the `Enquiry` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `mode` on the `Enquiry` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `type` on the `Enquiry` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "EnquiryMode" AS ENUM ('GENERAL', 'FLEET', 'PARCEL', 'PART_EX', 'STOCK');

-- CreateEnum
CREATE TYPE "EnquiryType" AS ENUM ('QUICK_QUESTION', 'QUOTE', 'FLEET_ENQUIRY', 'PART_EXCHANGE');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "EnquiryPriority" AS ENUM ('HIGH', 'NORMAL', 'LOW');

-- CreateEnum
CREATE TYPE "EnquiryQueue" AS ENUM ('GENERAL', 'FLEET', 'VALUATIONS');

-- AlterTable
ALTER TABLE "Enquiry" DROP COLUMN "mode",
ADD COLUMN     "mode" "EnquiryMode" NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" "EnquiryType" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
DROP COLUMN "priority",
ADD COLUMN     "priority" "EnquiryPriority" NOT NULL DEFAULT 'NORMAL',
DROP COLUMN "queue",
ADD COLUMN     "queue" "EnquiryQueue" NOT NULL DEFAULT 'GENERAL';
