import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ICategoryRepository, CATEGORY_REPOSITORY } from '../../domain/ports/category-repository.port';
import { CategoryEntity } from '../../domain/entities/category.entity';
import { UpdateCategoryDto } from '../dtos/update-category.dto';

@Injectable()
export class UpdateCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepo: ICategoryRepository,
  ) {}

  async execute(id: string, dto: UpdateCategoryDto): Promise<CategoryEntity> {
    const category = await this.categoryRepo.findById(id);
    if (!category) throw new NotFoundException('Category not found');

    if (dto.name === category.name) return category;

    if (dto.name.toLowerCase() !== category.name.toLowerCase()) {
      const nameExists = await this.categoryRepo.existsByName(dto.name, id);
      if (nameExists) throw new ConflictException('Category name already exists');
    }

    // Slug is intentionally not updated: it is immutable after creation for URL stability
    return this.categoryRepo.update(id, { name: dto.name });
  }
}
