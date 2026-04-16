import { Controller, Get, Post, Body, Param, Query, UseGuards, HttpCode, HttpStatus, Res, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DocumentGenerationService } from '../services/document-generation.service';
import { CreateDocumentTemplateDto, GenerateDocumentDto, ValidateTemplateDataDto } from '../dto/document-template.dto';
import { CurrentTenant } from '../../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../../types/express';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentGenerationController {
  constructor(private readonly documentService: DocumentGenerationService) {}

  @Post('templates')
  @ApiOperation({ summary: 'Create a new document template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  async createTemplate(
    @Body() dto: CreateDocumentTemplateDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtUser,
  ) {
    const template = await this.documentService.createTemplate(dto, tenantId, user.sub);
    return { success: true, data: template, message: 'Template created successfully' };
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get all document templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async getTemplates(
    @CurrentTenant() tenantId: string,
    @Query('category') category?: string,
  ) {
    const templates = await this.documentService.getTemplates(tenantId, category);
    return { success: true, data: templates, message: 'Templates retrieved successfully' };
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get a specific document template' })
  @ApiResponse({ status: 200, description: 'Template retrieved successfully' })
  async getTemplate(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    const template = await this.documentService.getTemplate(id, tenantId);
    return { success: true, data: template, message: 'Template retrieved successfully' };
  }

  @Post('validate-data')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate template data' })
  async validateTemplateData(
    @Body() dto: ValidateTemplateDataDto,
    @CurrentTenant() tenantId: string,
  ) {
    const data = typeof dto.data === 'string' ? JSON.parse(dto.data) : dto.data;
    const validation = await this.documentService.validateTemplateData(dto.templateId, data, tenantId);
    return { success: validation.valid, data: validation, message: validation.valid ? 'Data is valid' : 'Data validation failed' };
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate a document' })
  async generateDocument(
    @Body() dto: GenerateDocumentDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtUser,
  ) {
    const document = await this.documentService.generateDocument(dto, tenantId, user.sub);
    return { success: true, data: document, message: 'Document generated successfully' };
  }

  @Get()
  @ApiOperation({ summary: 'Get all generated documents' })
  async getDocuments(
    @CurrentTenant() tenantId: string,
    @Query('templateId') templateId?: string,
  ) {
    const documents = await this.documentService.getDocuments(tenantId, templateId);
    return { success: true, data: documents, message: 'Documents retrieved successfully' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific generated document' })
  async getDocument(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    const document = await this.documentService.getDocument(id, tenantId);
    return { success: true, data: document, message: 'Document retrieved successfully' };
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download a generated document' })
  async downloadDocument(@Param('id') id: string, @CurrentTenant() tenantId: string, @Res() res: Response) {
    
    const document = await this.documentService.getDocument(id, tenantId);
    
    if (!document.filePath) {
      throw new Error('Document file not found');
    }

    const fs = require('fs');
    const path = require('path');
    
    if (!fs.existsSync(document.filePath)) {
      throw new Error('Document file does not exist');
    }

    const fileName = `${document.title}.${document.format}`;
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', this.getContentType(document.format));
    
    const fileStream = fs.createReadStream(document.filePath);
    fileStream.pipe(res);
  }

  private getContentType(format: string): string {
    const contentTypes = {
      pdf: 'application/pdf',
      html: 'text/html',
      json: 'application/json',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    
    return contentTypes[format] || 'application/octet-stream';
  }
}
