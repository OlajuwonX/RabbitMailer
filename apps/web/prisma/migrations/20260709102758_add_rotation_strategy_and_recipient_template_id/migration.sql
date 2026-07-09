-- CreateEnum
CREATE TYPE "RotationStrategy" AS ENUM ('sequential', 'random');

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "rotationStrategy" "RotationStrategy" NOT NULL DEFAULT 'sequential';

-- AlterTable
ALTER TABLE "Recipient" ADD COLUMN     "templateId" TEXT;
