-- Fix: Grade.teacherId nullable + SetNull (teacher deletion preserves grade history)
ALTER TABLE `grades` DROP FOREIGN KEY `grades_teacherId_fkey`;
ALTER TABLE `grades` MODIFY `teacherId` VARCHAR(191) NULL;
ALTER TABLE `grades` ADD CONSTRAINT `grades_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Fix: CalendarEvent.createdById nullable + SetNull (user deletion preserves event history)
ALTER TABLE `calendar_events` DROP FOREIGN KEY `calendar_events_createdById_fkey`;
ALTER TABLE `calendar_events` MODIFY `createdById` VARCHAR(191) NULL;
ALTER TABLE `calendar_events` ADD CONSTRAINT `calendar_events_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Fix: Submission.fileAssetId FK (referential integrity for file references)
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_fileAssetId_fkey` FOREIGN KEY (`fileAssetId`) REFERENCES `file_assets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
