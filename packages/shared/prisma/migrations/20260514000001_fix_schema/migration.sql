-- Fix 2: Enrollment.status default ACTIVE -> PENDING
ALTER TABLE `enrollments` ALTER COLUMN `status` SET DEFAULT 'PENDING';

-- Fix 4: QuizQuestion unique constraint on (assignmentId, order)
ALTER TABLE `quiz_questions` ADD UNIQUE INDEX `quiz_questions_assignmentId_order_key`(`assignmentId`, `order`);

-- Fix 5: FileAsset.sizeBytes INT -> BIGINT
ALTER TABLE `file_assets` MODIFY COLUMN `sizeBytes` BIGINT NOT NULL;

-- Fix 6: ForumThread.courseId FK to courses (was missing)
ALTER TABLE `forum_threads` ADD CONSTRAINT `forum_threads_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Fix 8: ForumThread.authorId nullable + FK SET NULL
ALTER TABLE `forum_threads` DROP FOREIGN KEY `forum_threads_authorId_fkey`;
ALTER TABLE `forum_threads` MODIFY COLUMN `authorId` VARCHAR(191) NULL;
ALTER TABLE `forum_threads` ADD CONSTRAINT `forum_threads_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Fix 8: ForumPost.authorId nullable + FK SET NULL
ALTER TABLE `forum_posts` DROP FOREIGN KEY `forum_posts_authorId_fkey`;
ALTER TABLE `forum_posts` MODIFY COLUMN `authorId` VARCHAR(191) NULL;
ALTER TABLE `forum_posts` ADD CONSTRAINT `forum_posts_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Fix 9: FileAsset.uploaderId nullable + FK SET NULL
ALTER TABLE `file_assets` DROP FOREIGN KEY `file_assets_uploaderId_fkey`;
ALTER TABLE `file_assets` MODIFY COLUMN `uploaderId` VARCHAR(191) NULL;
ALTER TABLE `file_assets` ADD CONSTRAINT `file_assets_uploaderId_fkey` FOREIGN KEY (`uploaderId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
