import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as puppeteer from 'puppeteer';
import { DocumentTemplate } from '../entities/document-template.entity';
import { GeneratedDocument } from '../entities/generated-document.entity';
import { CreateDocumentTemplateDto, GenerateDocumentDto, ValidateTemplateDataDto } from '../dto/document-template.dto';

@Injectable()
export class DocumentGenerationService {
  constructor(
    @InjectRepository(DocumentTemplate)
    private templateRepository: Repository<DocumentTemplate>,
    @InjectRepository(GeneratedDocument)
    private documentRepository: Repository<GeneratedDocument>,
  ) {}

  async createTemplate(dto: CreateDocumentTemplateDto, tenantId: string | null, createdBy: string): Promise<DocumentTemplate> {
    const template = this.templateRepository.create({
      ...dto,
      tenantId,
      createdBy,
      variablesSchema: { variables: dto.variables },
    });

    return this.templateRepository.save(template);
  }

  async getTemplate(id: string, tenantId?: string): Promise<DocumentTemplate> {
    const query = this.templateRepository.createQueryBuilder('template')
      .leftJoinAndSelect('template.creator', 'creator')
      .where('template.id = :id', { id });

    if (tenantId) {
      query.andWhere('(template.tenantId = :tenantId OR template.tenantId IS NULL)', { tenantId });
    }

    const template = await query.getOne();
    
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  async getTemplates(tenantId?: string, category?: string): Promise<DocumentTemplate[]> {
    const query = this.templateRepository.createQueryBuilder('template')
      .leftJoinAndSelect('template.creator', 'creator')
      .where('template.isActive = :isActive', { isActive: true });

    if (tenantId) {
      query.andWhere('(template.tenantId = :tenantId OR template.tenantId IS NULL)', { tenantId });
    }

    if (category) {
      query.andWhere('template.category = :category', { category });
    }

    return query.orderBy('template.name', 'ASC').getMany();
  }

  async validateTemplateData(templateId: string, data: any, tenantId?: string): Promise<{ valid: boolean; errors: string[] }> {
    const template = await this.getTemplate(templateId, tenantId);
    const errors: string[] = [];

    const variables = template.variablesSchema?.variables || [];

    for (const variable of variables) {
      const value = data[variable.name];

      if (variable.required && (value === undefined || value === null || value === '')) {
        errors.push(`Required variable '${variable.name}' is missing`);
        continue;
      }

      if (value !== undefined && value !== null) {
        // Type validation
        if (variable.type === 'number' && isNaN(Number(value))) {
          errors.push(`Variable '${variable.name}' must be a number`);
        }

        if (variable.type === 'boolean' && typeof value !== 'boolean') {
          errors.push(`Variable '${variable.name}' must be a boolean`);
        }

        if (variable.type === 'date' && !(value instanceof Date) && isNaN(Date.parse(value))) {
          errors.push(`Variable '${variable.name}' must be a valid date`);
        }

        // Custom validation
        if (variable.validation) {
          const validation = JSON.parse(variable.validation);
          if (validation.min && Number(value) < validation.min) {
            errors.push(`Variable '${variable.name}' must be at least ${validation.min}`);
          }
          if (validation.max && Number(value) > validation.max) {
            errors.push(`Variable '${variable.name}' must be at most ${validation.max}`);
          }
          if (validation.pattern && !new RegExp(validation.pattern).test(String(value))) {
            errors.push(`Variable '${variable.name}' format is invalid`);
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async generateDocument(dto: GenerateDocumentDto, tenantId: string, createdBy: string): Promise<GeneratedDocument> {
    const template = await this.getTemplate(dto.templateId, tenantId);
    const data = typeof dto.data === 'string' ? JSON.parse(dto.data) : dto.data;

    // Validate data against template schema
    const validation = await this.validateTemplateData(dto.templateId, data, tenantId);
    if (!validation.valid) {
      throw new BadRequestException(`Data validation failed: ${validation.errors.join(', ')}`);
    }

    // Generate document content
    const renderedContent = await this.renderTemplate(template.templateContent, data);

    // Create document record
    const document = this.documentRepository.create({
      templateId: dto.templateId,
      title: this.generateDocumentTitle(template, data),
      format: dto.format,
      data,
      status: 'processing',
      tenantId,
      createdBy,
    });

    const savedDocument = await this.documentRepository.save(document);

    try {
      // Generate file based on format
      const filePath = await this.generateFile(renderedContent, dto.format ?? 'html', savedDocument.id);
      const fileSize = await this.getFileSize(filePath);

      // Update document with file info
      savedDocument.filePath = filePath;
      savedDocument.fileSize = fileSize;
      savedDocument.status = 'generated';
      await this.documentRepository.save(savedDocument);

    } catch (error) {
      savedDocument.status = 'failed';
      await this.documentRepository.save(savedDocument);
      throw error;
    }

    return savedDocument;
  }

  private async renderTemplate(templateContent: string, data: Record<string, any>): Promise<string> {
    let rendered = templateContent;

    // Simple variable substitution ({{variable.path}})
    const variableRegex = /\{\{([^}]+)\}\}/g;
    rendered = rendered.replace(variableRegex, (match, variablePath) => {
      const value = this.getNestedValue(data, variablePath.trim());
      return value !== undefined ? String(value) : match;
    });

    // Conditional blocks ({% if condition %} ... {% endif %})
    const ifRegex = /\{%\s*if\s+([^%]+)\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g;
    rendered = rendered.replace(ifRegex, (match, condition, content) => {
      const conditionResult = this.evaluateCondition(condition.trim(), data);
      return conditionResult ? content : '';
    });

    // Loops ({% for item in array %} ... {% endfor %})
    const forRegex = /\{%\s*for\s+(\w+)\s+in\s+([^%]+)\s*%\}([\s\S]*?)\{%\s*endfor\s*%\}/g;
    rendered = rendered.replace(forRegex, (match, itemName, arrayPath, content) => {
      const array = this.getNestedValue(data, arrayPath.trim());
      if (!Array.isArray(array)) return '';
      
      return array.map(item => {
        let itemContent = content;
        const itemRegex = new RegExp(`\\{\\{${itemName}\\.(\\w+)\\}\\}`, 'g');
        itemContent = itemContent.replace(itemRegex, (match, prop) => {
          return item[prop] !== undefined ? String(item[prop]) : match;
        });
        return itemContent;
      }).join('');
    });

    return rendered;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private evaluateCondition(condition: string, data: Record<string, any>): boolean {
    // Simple condition evaluation (can be enhanced with a proper expression parser)
    try {
      // Replace variables in condition
      const processedCondition = condition.replace(/\b(\w+(?:\.\w+)*)\b/g, (match) => {
        const value = this.getNestedValue(data, match);
        return typeof value === 'string' ? `"${value}"` : String(value);
      });

      // Use Function constructor for safe evaluation
      return new Function(`return ${processedCondition}`)();
    } catch {
      return false;
    }
  }

  private generateDocumentTitle(template: DocumentTemplate, data: Record<string, any>): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const entityName = data.employee?.name || data.company?.name || data.invoice?.number || 'Document';
    return `${template.name} - ${entityName} - ${timestamp}`;
  }

  private async generateFile(content: string, format: string, documentId: string): Promise<string> {
    const timestamp = new Date().getTime();
    const fileName = `${documentId}_${timestamp}.${format}`;
    const filePath = `./uploads/documents/${fileName}`;

    switch (format) {
      case 'html':
        await this.saveHtmlFile(content, filePath);
        break;
      case 'pdf':
        await this.generatePdfFile(content, filePath);
        break;
      case 'json':
        await this.saveJsonFile(content, filePath);
        break;
      default:
        throw new BadRequestException(`Unsupported format: ${format}`);
    }

    return filePath;
  }

  private async saveHtmlFile(content: string, filePath: string): Promise<void> {
    const fs = require('fs').promises;
    await fs.writeFile(filePath, content, 'utf8');
  }

  private async saveJsonFile(content: string, filePath: string): Promise<void> {
    const fs = require('fs').promises;
    await fs.writeFile(filePath, JSON.stringify({ content, generatedAt: new Date() }, null, 2), 'utf8');
  }

  private async generatePdfFile(htmlContent: string, filePath: string): Promise<void> {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.setContent(htmlContent);
    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm',
      },
    });

    await browser.close();
  }

  private async getFileSize(filePath: string): Promise<number> {
    const fs = require('fs').promises;
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  async getDocument(id: string, tenantId: string): Promise<GeneratedDocument> {
    const document = await this.documentRepository.findOne({
      where: { id, tenantId },
      relations: ['template', 'creator'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async getDocuments(tenantId: string, templateId?: string): Promise<GeneratedDocument[]> {
    const query = this.documentRepository.createQueryBuilder('document')
      .leftJoinAndSelect('document.template', 'template')
      .leftJoinAndSelect('document.creator', 'creator')
      .where('document.tenantId = :tenantId', { tenantId });

    if (templateId) {
      query.andWhere('document.templateId = :templateId', { templateId });
    }

    return query.orderBy('document.createdAt', 'DESC').getMany();
  }
}
