import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICategoryRepository, CATEGORY_REPOSITORY } from '../../domain/ports/category-repository.port';
import { CategoryEntity } from '../../domain/entities/category.entity';

@Injectable()
export class GetCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepo: ICategoryRepository,
  ) {}

  async execute(slug: string): Promise<CategoryEntity> {
    const category = await this.categoryRepo.findBySlug(slug);
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }
}
