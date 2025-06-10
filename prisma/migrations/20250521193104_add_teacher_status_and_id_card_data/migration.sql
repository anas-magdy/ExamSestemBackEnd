-- CreateEnum
CREATE TYPE "Status" AS ENUM ('Pending', 'Confirmed', 'Blocked');

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "idCardData" TEXT,
ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'Pending';
