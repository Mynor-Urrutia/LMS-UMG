-- Add parentId to forum_posts for nested replies
ALTER TABLE `forum_posts` ADD COLUMN `parentId` VARCHAR(191) NULL;
ALTER TABLE `forum_posts` ADD CONSTRAINT `forum_posts_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `forum_posts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX `forum_posts_parentId_idx` ON `forum_posts`(`parentId`);
