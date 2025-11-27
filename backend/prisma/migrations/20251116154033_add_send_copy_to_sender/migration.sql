-- AlterTable
ALTER TABLE "user_smtp_configs" ADD COLUMN     "sendCopyToSender" BOOLEAN NOT NULL DEFAULT false;
