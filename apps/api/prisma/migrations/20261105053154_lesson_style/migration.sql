-- AlterTable
ALTER TABLE "module_version" ADD COLUMN     "style" TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE "module_version" ADD CONSTRAINT "module_version_style" CHECK ("style" IN ('genz', 'standard', 'deep'));
