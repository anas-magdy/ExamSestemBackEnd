/*
  Warnings:

  - Changed the type of `idCardImage` on the `Teacher` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Teacher" DROP COLUMN "idCardImage",
ADD COLUMN     "idCardImage" JSONB NOT NULL;
