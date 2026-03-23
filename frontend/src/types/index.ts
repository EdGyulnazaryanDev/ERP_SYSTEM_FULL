export interface User {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  role: string;
  actorType: 'staff' | 'customer' | 'supplier';
  principalId?: string;
  isSystemAdmin: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  settings: Record<string, unknown>;
}

export interface ModuleDefinition {
  id: string;
  tenantId: string;
  name: string;
  displayName: string;
  description?: string;
  fields: ModuleField[];
  permissions: ModulePermission[];
  workflows?: WorkflowRule[];
  createdAt: string;
  updatedAt: string;
}

export interface ModuleField {
  id: string;
  name: string;
  displayName: string;
  type: FieldType;
  required: boolean;
  unique?: boolean;
  defaultValue?: unknown;
  validation?: FieldValidation;
  referenceModule?: string;
}

export type FieldType = 
  | 'text' 
  | 'number' 
  | 'date' 
  | 'boolean' 
  | 'reference' 
  | 'select'
  | 'multiselect'
  | 'email'
  | 'phone'
  | 'url';

export interface FieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  options?: string[];
}

export interface ModulePermission {
  role: string;
  actions: ('read' | 'write' | 'delete' | 'admin')[];
}

export interface WorkflowRule {
  id: string;
  name: string;
  condition: string;
  actions: WorkflowAction[];
}

export interface WorkflowAction {
  type: 'update_field' | 'send_notification' | 'trigger_workflow';
  config: Record<string, unknown>;
}

export interface ModuleInstance extends Record<string, unknown> {
  id: string;
  moduleId: string;
  tenantId: string;
  data: Record<string, unknown>;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
