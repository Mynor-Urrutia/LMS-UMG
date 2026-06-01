-- AlterTable
ALTER TABLE `assignments` MODIFY `type` ENUM('TEXT', 'FILE', 'QUIZ', 'DILEMMA') NOT NULL DEFAULT 'TEXT';

-- AlterTable
ALTER TABLE `badges` MODIFY `criteriaType` ENUM('COURSE_COMPLETE', 'PERFECT_QUIZ', 'FIRST_ENROLLMENT', 'STREAK', 'MANUAL', 'LEVEL_UP') NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE `course_modules` ADD COLUMN `prerequisiteModuleId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `lessons` ADD COLUMN `embedUrl` VARCHAR(191) NULL,
    MODIFY `type` ENUM('TEXT', 'VIDEO', 'FILE', 'EMBED') NOT NULL DEFAULT 'TEXT';

-- AlterTable
ALTER TABLE `submissions` ADD COLUMN `choiceId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `surveys` (
    `id` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `isAnonymous` BOOLEAN NOT NULL DEFAULT true,
    `isOpen` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `surveys_courseId_idx`(`courseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `survey_questions` (
    `id` VARCHAR(191) NOT NULL,
    `surveyId` VARCHAR(191) NOT NULL,
    `text` TEXT NOT NULL,
    `type` ENUM('MULTIPLE_CHOICE', 'TEXT', 'LIKERT', 'YES_NO') NOT NULL DEFAULT 'TEXT',
    `options` JSON NULL,
    `order` INTEGER NOT NULL,

    INDEX `survey_questions_surveyId_idx`(`surveyId`),
    UNIQUE INDEX `survey_questions_surveyId_order_key`(`surveyId`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `survey_responses` (
    `id` VARCHAR(191) NOT NULL,
    `surveyId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `survey_responses_surveyId_idx`(`surveyId`),
    INDEX `survey_responses_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `survey_answers` (
    `id` VARCHAR(191) NOT NULL,
    `responseId` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `textAnswer` TEXT NULL,
    `selected` JSON NULL,

    INDEX `survey_answers_responseId_idx`(`responseId`),
    INDEX `survey_answers_questionId_idx`(`questionId`),
    UNIQUE INDEX `survey_answers_responseId_questionId_key`(`responseId`, `questionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dilemma_scenarios` (
    `id` VARCHAR(191) NOT NULL,
    `assignmentId` VARCHAR(191) NOT NULL,
    `scenario` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `dilemma_scenarios_assignmentId_key`(`assignmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dilemma_choices` (
    `id` VARCHAR(191) NOT NULL,
    `scenarioId` VARCHAR(191) NOT NULL,
    `text` TEXT NOT NULL,
    `consequence` TEXT NOT NULL,
    `ethicalScore` INTEGER NOT NULL DEFAULT 50,
    `order` INTEGER NOT NULL,

    INDEX `dilemma_choices_scenarioId_idx`(`scenarioId`),
    UNIQUE INDEX `dilemma_choices_scenarioId_order_key`(`scenarioId`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `course_modules_prerequisiteModuleId_idx` ON `course_modules`(`prerequisiteModuleId`);

-- CreateIndex
CREATE INDEX `submissions_choiceId_idx` ON `submissions`(`choiceId`);

-- AddForeignKey
ALTER TABLE `course_modules` ADD CONSTRAINT `course_modules_prerequisiteModuleId_fkey` FOREIGN KEY (`prerequisiteModuleId`) REFERENCES `course_modules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_choiceId_fkey` FOREIGN KEY (`choiceId`) REFERENCES `dilemma_choices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `surveys` ADD CONSTRAINT `surveys_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_questions` ADD CONSTRAINT `survey_questions_surveyId_fkey` FOREIGN KEY (`surveyId`) REFERENCES `surveys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_responses` ADD CONSTRAINT `survey_responses_surveyId_fkey` FOREIGN KEY (`surveyId`) REFERENCES `surveys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_responses` ADD CONSTRAINT `survey_responses_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_answers` ADD CONSTRAINT `survey_answers_responseId_fkey` FOREIGN KEY (`responseId`) REFERENCES `survey_responses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `survey_answers` ADD CONSTRAINT `survey_answers_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `survey_questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dilemma_scenarios` ADD CONSTRAINT `dilemma_scenarios_assignmentId_fkey` FOREIGN KEY (`assignmentId`) REFERENCES `assignments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dilemma_choices` ADD CONSTRAINT `dilemma_choices_scenarioId_fkey` FOREIGN KEY (`scenarioId`) REFERENCES `dilemma_scenarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
