# API Services Documentation

## Overview

The frontend uses a service-based architecture with a base service class that provides common CRUD operations, filtering, sorting, and pagination.

## BaseService

All services extend `BaseService<T>` which provides:

### Methods

#### `getAll(params?: QueryParams)`
Fetch paginated data with filters and sorting.

```typescript
const response = await service.getAll({
  page: 1,
  pageSize: 10,
  filters: [
    { field: 'status', operator: 'eq', value: 'active' },
    { field: 'name', operator: 'like', value: 'John' }
  ],
  sort: [
    { field: 'createdAt', order: 'desc' }
  ],
  search: 'keyword'
});
```

#### `getById(id: string | number)`
Fetch a single record by ID.

```typescript
const response = await service.getById('123');
```

#### `create(data: Partial<T>)`
Create a new record.

```typescript
const response = await service.create({
  name: 'New Record',
  status: 'active'
});
```

#### `update(id: string | number, data: Partial<T>)`
Update an existing record (full update).

```typescript
const response = await service.update('123', {
  name: 'Updated Name',
  status: 'inactive'
});
```

#### `patch(id: string | number, data: Partial<T>)`
Partially update a record.

```typescript
const response = await service.patch('123', {
  status: 'inactive'
});
```

#### `delete(id: string | number)`
Delete a single record.

```typescript
await service.delete('123');
```

#### `bulkDelete(ids: (string | number)[])`
Delete multiple records.

```typescript
await service.bulkDelete(['123', '456', '789']);
```

#### `export(params?: QueryParams, format: 'csv' | 'xlsx')`
Export data to CSV or Excel.

```typescript
const blob = await service.export(
  { filters: [...] },
  'xlsx'
);
```

## Filter Operators

- `eq` - Equals
- `ne` - Not equals
- `gt` - Greater than
- `gte` - Greater than or equal
- `lt` - Less than
- `lte` - Less than or equal
- `like` - Contains (case-insensitive)
- `in` - In array
- `between` - Between two values

## Available Services

### ModuleService
Manages module definitions.

```typescript
import { moduleService } from '@/services';

// Get all modules
const modules = await moduleService.getAll();

// Validate schema
await moduleService.validateSchema(schema);

// Duplicate module
await moduleService.duplicateModule('id', 'New Name');

// Get stats
const stats = await moduleService.getModuleStats('id');
```

### ModuleDataService
Manages module instance data.

```typescript
import { createModuleDataService } from '@/services';

const service = createModuleDataService('moduleId');

// Bulk create
await service.bulkCreate([
  { name: 'Record 1' },
  { name: 'Record 2' }
]);

// Import from file
await service.import(file, mapping);

// Get history
const history = await service.getHistory('recordId');

// Restore version
await service.restore('recordId', 5);
```

### UserService
Manages users.

```typescript
import { userService } from '@/services';

// Update profile
await userService.updateProfile({ name: 'New Name' });

// Change password
await userService.changePassword('old', 'new');

// Assign role
await userService.assignRole('userId', 'admin');

// Manage permissions
await userService.updatePermissions('userId', ['read', 'write']);
```

### TenantService
Manages tenant settings.

```typescript
import { tenantService } from '@/services';

// Get current tenant
const tenant = await tenantService.getCurrentTenant();

// Update settings
await tenantService.updateSettings({ theme: 'dark' });

// Get usage stats
const stats = await tenantService.getUsageStats();

// Invite user
await tenantService.inviteUser('email@example.com', 'user');
```

### ReportService
Manages reports.

```typescript
import { reportService } from '@/services';

// Generate report
const data = await reportService.generate('reportId', params);

// Schedule report
await reportService.schedule('reportId', {
  cron: '0 9 * * *',
  recipients: ['email@example.com']
});
```

### WorkflowService
Manages workflows.

```typescript
import { workflowService } from '@/services';

// Execute workflow
await workflowService.execute('workflowId', data);

// Get execution history
const history = await workflowService.getExecutionHistory('workflowId');

// Validate rule
await workflowService.validateRule(rule);

// Toggle active status
await workflowService.toggleActive('workflowId', true);
```

## Custom Hooks

### useDataTable
Manages table state (pagination, filters, sorting).

```typescript
import { useDataTable } from '@/hooks/useDataTable';

const {
  page,
  pageSize,
  filters,
  sort,
  search,
  queryParams,
  handlePageChange,
  handleFilterChange,
  handleSortChange,
  handleSearchChange,
  resetFilters,
} = useDataTable(10); // initial page size
```

### useCrudOperations
Manages CRUD operations with modal state.

```typescript
import { useCrudOperations } from '@/hooks/useCrudOperations';

const {
  isModalOpen,
  editingRecord,
  openModal,
  closeModal,
  createMutation,
  updateMutation,
  deleteMutation,
  bulkDeleteMutation,
} = useCrudOperations(service, ['queryKey']);
```

### usePermissions
Checks user permissions.

```typescript
import { usePermissions } from '@/hooks/usePermissions';

const {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canRead,
  canWrite,
  canDelete,
  isAdmin,
} = usePermissions();
```

## Components

### DataTable
Advanced table with filtering, sorting, and pagination.

```typescript
<DataTable
  columns={columns}
  data={data}
  loading={loading}
  total={total}
  page={page}
  pageSize={pageSize}
  onPageChange={handlePageChange}
  onFilterChange={handleFilterChange}
  onSortChange={handleSortChange}
  onExport={handleExport}
  rowKey="id"
  rowSelection={rowSelection}
/>
```

### DynamicForm
Auto-generated form based on module fields.

```typescript
<DynamicForm
  form={form}
  fields={moduleFields}
  initialValues={record}
  onSubmit={handleSubmit}
  loading={loading}
  submitText="Save"
  onCancel={handleCancel}
/>
```

### FilterBuilder
Visual filter builder.

```typescript
<FilterBuilder
  fields={moduleFields}
  onFilterChange={handleFilterChange}
/>
```

### BulkImport
Excel/CSV import with column mapping.

```typescript
<BulkImport
  visible={visible}
  onClose={handleClose}
  fields={moduleFields}
  onImport={handleImport}
/>
```
