export type FieldType =
  | 'text'
  | 'longtext'
  | 'number'
  | 'integer'
  | 'decimal'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'email'
  | 'phone'
  | 'url'
  | 'select';

export interface ModuleField {
  name: string;
  displayName: string;
  type: FieldType;
  required: boolean;
  unique?: boolean;
  defaultValue?: any;
  options?: string[]; // For select type
  description?: string;
}

export interface ModuleDefinition {
  id: string;
  tenant_id: string;
  name: string;
  displayName: string;
  description?: string;
  icon?: string;
  color?: string;
  fields: ModuleField[];
  tableCreated: boolean;
  created_at: Date;
  updated_at: Date;
}
