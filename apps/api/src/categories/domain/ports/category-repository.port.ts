import { CategoryEntity } from '../entities/category.entity';

export const CATEGORY_REPOSITORY = 'CATEGORY_REPOSITORY';

export interface ICreateCategoryData {
  name: string;
  slug: string;
}

// Slug is intentionally absent: it is immutable after creation for URL stability
export interface IUpdateCategoryData {
  name: string;
}

export interface ICategoryRepository {
  findAll(): Promise<CategoryEntity[]>;
  findById(id: string): Promise<CategoryEntity | null>;
  findBySlug(slug: string): Promise<CategoryEntity | null>;
  existsByName(name: string, excludeId?: string): Promise<boolean>;
  existsBySlug(slug: string): Promise<boolean>;
  create(data: ICreateCategoryData): Promise<CategoryEntity>;
  update(id: string, data: IUpdateCategoryData): Promise<CategoryEntity>;
  delete(id: string): Promise<void>;
}
