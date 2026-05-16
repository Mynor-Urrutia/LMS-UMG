import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { ICategoryRepository, CATEGORY_REPOSITORY } from '../../domain/ports/category-repository.port';
import { CategoryEntity } from '../../domain/entities/category.entity';
import { CreateCategoryDto } from '../dtos/create-category.dto';
import { slugify } from '../../../../common/utils/slugify';

@Injectable()
export class CreateCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepo: ICategoryRepository,
  ) {}

  async execute(dto: CreateCategoryDto): Promise<CategoryEntity> {
    const nameExists = await this.categoryRepo.existsByName(dto.name);
    if (nameExists) throw new ConflictException('Category name already exists');

    const slug = slugify(dto.name);
    if (!slug) throw new BadRequestException('Category name produces an empty slug');

    const slugExists = await this.categoryRepo.existsBySlug(slug);
    if (slugExists) throw new ConflictException('A category with an equivalent slug already exists');

    return this.categoryRepo.create({ name: dto.name, slug });
  }
}
