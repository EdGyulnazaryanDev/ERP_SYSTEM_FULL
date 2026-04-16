import apiClient from './client';

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'object' | 'array';
  required: boolean;
  defaultValue?: any;
  validation?: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  category: string;
  templateType: 'html' | 'markdown' | 'json' | 'docx';
  templateContent: string;
  variablesSchema: {
    variables: TemplateVariable[];
  };
  outputFormats: string[];
  isActive: boolean;
  tenantId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedDocument {
  id: string;
  templateId: string;
  template: DocumentTemplate;
  title: string;
  filePath: string | null;
  fileSize: number | null;
  format: string;
  data: Record<string, any>;
  status: 'generated' | 'processing' | 'failed' | 'archived';
  tenantId: string;
  createdBy: string;
  createdAt: string;
}

export interface CreateTemplatePayload {
  name: string;
  category: string;
  templateType: 'html' | 'markdown' | 'json' | 'docx';
  templateContent: string;
  variables: TemplateVariable[];
  outputFormats?: string[];
  isActive?: boolean;
}

export interface GenerateDocumentPayload {
  templateId: string;
  data: Record<string, any>;
  format?: 'pdf' | 'docx' | 'html' | 'json';
  language?: string;
  watermark?: string;
  digitalSignature?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export const documentsApi = {
  // Template Management
  getTemplates: (category?: string) => 
    apiClient.get<DocumentTemplate[]>(`/documents/templates${category ? `?category=${category}` : ''}`),
  
  getTemplate: (id: string) => 
    apiClient.get<DocumentTemplate>(`/documents/templates/${id}`),
  
  createTemplate: (data: CreateTemplatePayload) => 
    apiClient.post<DocumentTemplate>('/documents/templates', data),
  
  updateTemplate: (id: string, data: Partial<CreateTemplatePayload>) => 
    apiClient.patch<DocumentTemplate>(`/documents/templates/${id}`, data),
  
  deleteTemplate: (id: string) => 
    apiClient.delete(`/documents/templates/${id}`),

  // Document Generation
  validateTemplateData: (templateId: string, data: Record<string, any>) => 
    apiClient.post<ValidationResult>('/documents/validate-data', { templateId, data: JSON.stringify(data) }),
  
  generateDocument: (data: GenerateDocumentPayload) => 
    apiClient.post<GeneratedDocument>('/documents/generate', data),
  
  previewDocument: (templateId: string, data: Record<string, any>) => 
    apiClient.post<string>('/documents/preview', { templateId, data: JSON.stringify(data) }),

  // Document Management
  getDocuments: (templateId?: string) => 
    apiClient.get<GeneratedDocument[]>(`/documents${templateId ? `?templateId=${templateId}` : ''}`),
  
  getDocument: (id: string) => 
    apiClient.get<GeneratedDocument>(`/documents/${id}`),
  
  downloadDocument: (id: string) => 
    apiClient.get(`/documents/${id}/download`, { responseType: 'blob' }),
  
  deleteDocument: (id: string) => 
    apiClient.delete(`/documents/${id}`),
};
