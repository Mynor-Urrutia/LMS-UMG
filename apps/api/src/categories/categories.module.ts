import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { CATEGORY_REPOSITORY } from './domain/ports/category-repository.port';
import { PrismaCategoriesAdapter } from './infrastructure/adapters/prisma-categories.adapter';
import { CreateCategoryUseCase } from './application/use-cases/create-category.use-case';
import { ListCategoriesUseCase } from './application/use-cases/list-categories.use-case';
import { GetCategoryUseCase } from './application/use-cases/get-category.use-case';
import { UpdateCategoryUseCase } from './application/use-cases/update-category.use-case';
import { DeleteCategoryUseCase } from './application/use-cases/delete-category.use-case';
import { CategoriesController } from './infrastructure/http/categories.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CategoriesController],
  providers: [
    { provide: CATEGORY_REPOSITORY, useClass: PrismaCategoriesAdapter },
    CreateCategoryUseCase,
    ListCategoriesUseCase,
    GetCategoryUseCase,
    UpdateCategoryUseCase,
    DeleteCategoryUseCase,
  ],
})
export class CategoriesModule {}
