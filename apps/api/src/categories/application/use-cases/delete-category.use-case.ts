import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICategoryRepository, CATEGORY_REPOSITORY } from '../../domain/ports/category-repository.port';

@Injectable()
export class DeleteCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepo: ICategoryRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const category = await this.categoryRepo.findById(id);
    if (!category) throw new NotFoundException('Category not found');

    if (category.courseCount > 0) {
      throw new ConflictException(
        `Cannot delete a category that has ${category.courseCount} course(s)`,
      );
    }

    await this.categoryRepo.delete(id);
  }
}
