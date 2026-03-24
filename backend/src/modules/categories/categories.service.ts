import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryEntity } from './entities/category.entity';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PlanLimitKey } from '../subscriptions/subscription.constants';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(CategoryEntity)
    private categoryRepo: Repository<CategoryEntity>,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async findAll(tenantId: string): Promise<CategoryEntity[]> {
    return this.categoryRepo.find({
      where: { tenant_id: tenantId },
      relations: ['parent'],
      order: { sort_order: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<CategoryEntity> {
    const category = await this.categoryRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['parent'],
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async create(
    data: CreateCategoryDto,
    tenantId: string,
  ): Promise<CategoryEntity> {
    const currentCount = await this.categoryRepo.count({ where: { tenant_id: tenantId } });
    await this.subscriptionsService.assertWithinLimit(tenantId, PlanLimitKey.CATEGORIES, currentCount);

    // Generate slug from name
    const slug = this.generateSlug(data.name, tenantId);

    // Check if slug already exists
    const existing = await this.categoryRepo.findOne({
      where: { slug, tenant_id: tenantId },
    });

    if (existing) {
      throw new ConflictException('Category with this name already exists');
    }

    // Validate parent if provided
    if (data.parent_id) {
      const parent = await this.categoryRepo.findOne({
        where: { id: data.parent_id, tenant_id: tenantId },
      });

      if (!parent) {
        throw new BadRequestException('Parent category not found');
      }
    }

    const category = this.categoryRepo.create({
      ...data,
      slug,
      tenant_id: tenantId,
    });

    return this.categoryRepo.save(category);
  }

  async update(
    id: string,
    data: UpdateCategoryDto,
    tenantId: string,
  ): Promise<CategoryEntity> {
    const category = await this.findOne(id, tenantId);

    // If name is being updated, regenerate slug
    if (data.name && data.name !== category.name) {
      const slug = this.generateSlug(data.name, tenantId);

      // Check if new slug already exists
      const existing = await this.categoryRepo.findOne({
        where: { slug, tenant_id: tenantId },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException('Category with this name already exists');
      }

      category.slug = slug;
    }

    // Validate parent if provided
    if (data.parent_id) {
      if (data.parent_id === id) {
        throw new BadRequestException('Category cannot be its own parent');
      }

      const parent = await this.categoryRepo.findOne({
        where: { id: data.parent_id, tenant_id: tenantId },
      });

      if (!parent) {
        throw new BadRequestException('Parent category not found');
      }
    }

    Object.assign(category, data);
    return this.categoryRepo.save(category);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const category = await this.findOne(id, tenantId);

    // Check if category has children
    const children = await this.categoryRepo.count({
      where: { parent_id: id, tenant_id: tenantId },
    });

    if (children > 0) {
      throw new BadRequestException(
        'Cannot delete category with subcategories',
      );
    }

    await this.categoryRepo.remove(category);
  }

  async getTree(tenantId: string): Promise<CategoryEntity[]> {
    // Get all categories
    const categories = await this.findAll(tenantId);

    // Build tree structure
    const categoryMap = new Map<
      string,
      CategoryEntity & { children?: CategoryEntity[] }
    >();
    const rootCategories: (CategoryEntity & {
      children?: CategoryEntity[];
    })[] = [];

    // First pass: create map
    categories.forEach((cat) => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    // Second pass: build tree
    categories.forEach((cat) => {
      const category = categoryMap.get(cat.id);
      if (!category) return;

      if (cat.parent_id) {
        const parent = categoryMap.get(cat.parent_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(category);
        }
      } else {
        rootCategories.push(category);
      }
    });

    return rootCategories;
  }

  private generateSlug(name: string, tenantId: string): string {
    return `${tenantId.substring(0, 8)}_${name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')}`;
  }
}
