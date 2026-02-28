import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { CategoryEntity } from './entities/category.entity';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repository: jest.Mocked<Repository<CategoryEntity>>;

  const mockCategory: CategoryEntity = {
    id: 'cat-1',
    tenant_id: 'tenant-1',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Electronic products',
    color: null,
    icon: null,
    parent_id: null,
    parent: null,
    is_active: true,
    sort_order: 0,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getRepositoryToken(CategoryEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            count: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    repository = module.get(getRepositoryToken(CategoryEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all categories for tenant', async () => {
      const categories = [mockCategory];
      repository.find.mockResolvedValue(categories);

      const result = await service.findAll('tenant-1');

      expect(result).toEqual(categories);
      expect(repository.find).toHaveBeenCalledWith({
        where: { tenant_id: 'tenant-1' },
        relations: ['parent'],
        order: { name: 'ASC', sort_order: 'ASC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return category by id', async () => {
      repository.findOne.mockResolvedValue(mockCategory);

      const result = await service.findOne('cat-1', 'tenant-1');

      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException if category not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('cat-999', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create category successfully', async () => {
      const createDto = {
        name: 'Computers',
        description: 'Computer hardware',
      };

      const newCategory = { ...mockCategory, ...createDto, slug: 'computers' };
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(newCategory);
      repository.save.mockResolvedValue(newCategory);

      const result = await service.create(createDto as any, 'tenant-1');

      expect(result).toHaveProperty('id');
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if category name exists', async () => {
      const createDto = { name: 'Electronics' };

      repository.findOne.mockResolvedValue(mockCategory);

      await expect(
        service.create(createDto as any, 'tenant-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update category successfully', async () => {
      const updateDto = { description: 'Updated description' };
      const updated = { ...mockCategory, ...updateDto };

      repository.findOne.mockResolvedValue(mockCategory);
      repository.save.mockResolvedValue(updated);

      const result = await service.update('cat-1', updateDto as any, 'tenant-1');

      expect(result.description).toBe('Updated description');
    });
  });

  describe('delete', () => {
    it('should delete category successfully', async () => {
      repository.findOne.mockResolvedValue(mockCategory);
      repository.count.mockResolvedValue(0);
      repository.remove.mockResolvedValue(mockCategory);

      await service.delete('cat-1', 'tenant-1');

      expect(repository.count).toHaveBeenCalledWith({
        where: { parent_id: 'cat-1', tenant_id: 'tenant-1' },
      });
      expect(repository.remove).toHaveBeenCalled();
    });
  });
});
