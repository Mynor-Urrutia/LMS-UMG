-- QuestionType enum (MySQL uses ENUM in column definition, Prisma handles mapping)
-- AttendanceStatus enum

CREATE TABLE `evaluations` (
  `id` VARCHAR(191) NOT NULL,
  `courseId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `dueDate` DATETIME(3) NULL,
  `totalPoints` INTEGER NOT NULL DEFAULT 100,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `evaluations_courseId_idx` (`courseId`),
  CONSTRAINT `evaluations_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `evaluation_questions` (
  `id` VARCHAR(191) NOT NULL,
  `evaluationId` VARCHAR(191) NOT NULL,
  `text` TEXT NOT NULL,
  `type` ENUM('TEXT','MCQ','TRUE_FALSE') NOT NULL,
  `points` INTEGER NOT NULL DEFAULT 10,
  `order` INTEGER NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `evaluation_questions_evaluationId_order_key` (`evaluationId`, `order`),
  INDEX `evaluation_questions_evaluationId_idx` (`evaluationId`),
  CONSTRAINT `evaluation_questions_evaluationId_fkey` FOREIGN KEY (`evaluationId`) REFERENCES `evaluations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `question_options` (
  `id` VARCHAR(191) NOT NULL,
  `questionId` VARCHAR(191) NOT NULL,
  `text` VARCHAR(500) NOT NULL,
  `isCorrect` BOOLEAN NOT NULL DEFAULT false,
  `order` INTEGER NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `question_options_questionId_idx` (`questionId`),
  CONSTRAINT `question_options_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `evaluation_questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `student_attempts` (
  `id` VARCHAR(191) NOT NULL,
  `evaluationId` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `score` INTEGER NULL,
  `feedback` TEXT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `student_attempts_evaluationId_studentId_key` (`evaluationId`, `studentId`),
  INDEX `student_attempts_evaluationId_idx` (`evaluationId`),
  INDEX `student_attempts_studentId_idx` (`studentId`),
  CONSTRAINT `student_attempts_evaluationId_fkey` FOREIGN KEY (`evaluationId`) REFERENCES `evaluations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `student_attempts_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `question_answers` (
  `id` VARCHAR(191) NOT NULL,
  `attemptId` VARCHAR(191) NOT NULL,
  `questionId` VARCHAR(191) NOT NULL,
  `textAnswer` TEXT NULL,
  `selectedIds` VARCHAR(1000) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `question_answers_attemptId_questionId_key` (`attemptId`, `questionId`),
  INDEX `question_answers_attemptId_idx` (`attemptId`),
  INDEX `question_answers_questionId_idx` (`questionId`),
  CONSTRAINT `question_answers_attemptId_fkey` FOREIGN KEY (`attemptId`) REFERENCES `student_attempts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `question_answers_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `evaluation_questions`(`id`) ON DELETE NO ACTION ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `attendance_sessions` (
  `id` VARCHAR(191) NOT NULL,
  `courseId` VARCHAR(191) NOT NULL,
  `date` DATE NOT NULL,
  `notes` VARCHAR(500) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `attendance_sessions_courseId_date_key` (`courseId`, `date`),
  INDEX `attendance_sessions_courseId_idx` (`courseId`),
  CONSTRAINT `attendance_sessions_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `attendance_records` (
  `id` VARCHAR(191) NOT NULL,
  `sessionId` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `status` ENUM('PRESENT','ABSENT','LATE','EXCUSED') NOT NULL DEFAULT 'PRESENT',
  PRIMARY KEY (`id`),
  UNIQUE INDEX `attendance_records_sessionId_studentId_key` (`sessionId`, `studentId`),
  INDEX `attendance_records_sessionId_idx` (`sessionId`),
  INDEX `attendance_records_studentId_idx` (`studentId`),
  CONSTRAINT `attendance_records_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `attendance_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `attendance_records_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
