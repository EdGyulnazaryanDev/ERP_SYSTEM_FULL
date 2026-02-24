# Dynamic ERP System - Frontend

Enterprise-grade React frontend for the Dynamic ERP System with advanced features for high-performance applications.

## 🚀 Tech Stack

- **React 18** - Modern UI library with concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Ant Design 5** - Enterprise UI component library
- **TanStack Query v5** - Powerful server state management
- **Zustand** - Lightweight client state management
- **React Router v6** - Client-side routing
- **Axios** - HTTP client with interceptors
- **Tailwind CSS** - Utility-first styling
- **XLSX** - Excel import/export
- **Day.js** - Date manipulation

## ✨ Key Features

### Core Functionality
- 🏢 **Multi-tenant Architecture** - Complete tenant isolation
- 🔧 **Dynamic Module Builder** - Create custom modules without code
- 📊 **Advanced Data Tables** - Filtering, sorting, pagination
- 📝 **Dynamic Forms** - Auto-generated CRUD forms
- 📤 **Bulk Import/Export** - Excel/CSV with column mapping
- 🔍 **Advanced Search** - Full-text and field-specific search
- 🎯 **Filter Builder** - Visual query builder
- 📈 **Real-time Updates** - Optimistic UI updates

### Performance Features
- ⚡ **Query Caching** - 5-minute stale time
- 🔄 **Optimistic Updates** - Instant UI feedback
- 📦 **Code Splitting** - Lazy-loaded routes
- 🎨 **Virtual Scrolling** - Handle large datasets
- 💾 **Persistent State** - Auth state survives refresh

### Security & Permissions
- 🔐 **JWT Authentication** - Secure token-based auth
- 👥 **Role-based Access Control** - Granular permissions
- 🛡️ **Permission Guards** - Component-level protection
- 🔒 **Secure API Client** - Auto token injection

## 📁 Project Structure

```
src/
├── api/              # API client and endpoint definitions
│   ├── client.ts     # Axios instance with interceptors
│   ├── auth.ts       # Authentication endpoints
│   └── modules.ts    # Module endpoints
├── components/       # Reusable components
│   ├── common/       # Shared components
│   │   ├── DataTable.tsx        # Advanced table
│   │   ├── PermissionGuard.tsx  # Access control
│   │   └── SearchBar.tsx        # Search component
│   └── forms/        # Form components
│       ├── DynamicForm.tsx      # Auto-generated forms
│       ├── FilterBuilder.tsx    # Visual filters
│       └── BulkImport.tsx       # Import wizard
├── hooks/            # Custom React hooks
│   ├── useDataTable.ts          # Table state management
│   ├── useCrudOperations.ts    # CRUD operations
│   └── usePermissions.ts        # Permission checks
├── layouts/          # Layout components
│   ├── MainLayout.tsx           # App layout
│   └── AuthLayout.tsx           # Auth pages layout
├── pages/            # Page components
│   ├── auth/         # Authentication pages
│   ├── modules/      # Module management
│   └── DashboardPage.tsx
├── services/         # Service layer (API abstraction)
│   ├── BaseService.ts           # Base CRUD service
│   ├── ModuleService.ts         # Module operations
│   ├── ModuleDataService.ts     # Module data CRUD
│   ├── UserService.ts           # User management
│   ├── TenantService.ts         # Tenant operations
│   ├── ReportService.ts         # Reporting
│   └── WorkflowService.ts       # Workflow automation
├── store/            # Zustand stores
│   └── authStore.ts  # Authentication state
├── types/            # TypeScript definitions
│   └── index.ts      # Shared types
├── utils/            # Utility functions
│   ├── exportHelpers.ts         # Export utilities
│   └── validators.ts            # Form validators
└── main.tsx          # Application entry point
```

## 🔐 Authentication Flow

### Registration (First Time Setup)

1. Navigate to `/auth/register`
2. **Step 1**: Enter your company name (creates new tenant)
3. **Step 2**: Create admin account:
   - First Name & Last Name
   - Email (used for login)
   - Password (min 6 characters)
4. System automatically:
   - Creates tenant (company)
   - Creates admin user
   - Assigns admin role
   - Logs you in with JWT token

### Login

1. Navigate to `/auth/login`
2. Enter email and password
3. JWT token is stored and auto-injected in API calls
4. On 401, user is redirected to login

### Backend Integration

The frontend expects these endpoints:

```typescript
POST /api/auth/register
{
  "companyName": "Acme Corp",
  "email": "admin@acme.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
Response: { "accessToken": "jwt_token" }

POST /api/auth/login
{
  "email": "admin@acme.com",
  "password": "password123"
}
Response: { "accessToken": "jwt_token" }
```

JWT Payload:
```json
{
  "sub": "user_id",
  "tenant_id": "tenant_id",
  "email": "user@email.com"
}
```

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Backend API running on port 3001

### Installation

```bash
# Navigate to frontend directory
cd ERP_SYSTEM_FRONT

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

### First Time Setup

1. **Register Your Company**
   - Go to `http://localhost:3000/auth/register`
   - Enter company name
   - Create your admin account
   - You'll be automatically logged in

2. **Create Your First Module**
   - Navigate to "Modules"
   - Click "Create Module"
   - Define fields and properties
   - Start adding data

See [GETTING_STARTED.md](./docs/GETTING_STARTED.md) for detailed setup guide.

### Build for Production

```bash
# Type check
npm run type-check

# Lint code
npm run lint

# Build
npm run build

# Preview production build
npm run preview
```

## 🔧 Configuration

### Environment Variables

```env
VITE_API_URL=http://localhost:3001/api
```

### API Client Configuration

The API client (`src/api/client.ts`) automatically:
- Injects JWT tokens from auth store
- Handles 401 redirects to login
- Sets proper headers
- 30-second timeout

## 📚 Service Layer

All API calls go through service classes that extend `BaseService`:

```typescript
import { moduleService } from '@/services';

// Get all with filters
const response = await moduleService.getAll({
  page: 1,
  pageSize: 10,
  filters: [
    { field: 'status', operator: 'eq', value: 'active' }
  ],
  sort: [
    { field: 'createdAt', order: 'desc' }
  ]
});
```

See [API_SERVICES.md](./docs/API_SERVICES.md) for complete documentation.

## 🎨 Component Usage

### DataTable with Filters

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
/>
```

### Dynamic Form

```typescript
<DynamicForm
  form={form}
  fields={moduleFields}
  initialValues={record}
  onSubmit={handleSubmit}
  loading={loading}
/>
```

## 🔐 Authentication Flow

1. User logs in via `/auth/login`
2. JWT token stored in Zustand (persisted to localStorage)
3. Token auto-injected in all API requests
4. On 401, user redirected to login
5. Protected routes check `isAuthenticated`

## 📊 State Management

- **Server State**: TanStack Query (API data, caching)
- **Client State**: Zustand (auth, UI state)
- **Form State**: Ant Design Form
- **URL State**: React Router (pagination, filters)

## 🚀 Performance Optimizations

- Query caching with 5-minute stale time
- Automatic query invalidation on mutations
- Optimistic updates for instant feedback
- Debounced search inputs
- Lazy-loaded routes
- Memoized expensive computations

## 🧪 Development Tips

### Adding a New Module Page

1. Create service in `src/services/`
2. Create page in `src/pages/`
3. Add route in `src/App.tsx`
4. Use `useDataTable` and `useCrudOperations` hooks

### Adding Custom Filters

Use `FilterBuilder` component or extend `DataTable` columns with `filterable: true`

## 📖 Documentation

- [Getting Started](./docs/GETTING_STARTED.md) - Complete setup and usage guide
- [Authentication](./docs/AUTHENTICATION.md) - Registration and login flow
- [API Services](./docs/API_SERVICES.md) - Complete service layer docs
- [Examples](./docs/EXAMPLES.md) - Code examples and patterns
- [Component Library](./docs/COMPONENTS.md) - Component usage guide (coming soon)
- [Hooks](./docs/HOOKS.md) - Custom hooks reference (coming soon)

## 🤝 Contributing

1. Follow TypeScript strict mode
2. Use Ant Design components
3. Implement proper error handling
4. Add loading states
5. Write type-safe code

## 📄 License

Proprietary - All rights reserved
