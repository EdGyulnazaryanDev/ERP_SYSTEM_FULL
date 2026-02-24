# System Architecture

## Overview

The ERP frontend is built with a modern, scalable architecture designed for high performance and maintainability.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    React App                          │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │  │
│  │  │   Pages     │  │  Components  │  │   Layouts   │ │  │
│  │  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘ │  │
│  │         │                │                  │         │  │
│  │         └────────────────┴──────────────────┘         │  │
│  │                          │                            │  │
│  │         ┌────────────────┴────────────────┐           │  │
│  │         │                                 │           │  │
│  │    ┌────▼─────┐                    ┌─────▼────┐      │  │
│  │    │  Hooks   │                    │  Store   │      │  │
│  │    │          │                    │ (Zustand)│      │  │
│  │    └────┬─────┘                    └─────┬────┘      │  │
│  │         │                                 │           │  │
│  │         └────────────────┬────────────────┘           │  │
│  │                          │                            │  │
│  │                    ┌─────▼──────┐                     │  │
│  │                    │  Services  │                     │  │
│  │                    │ (BaseService)                    │  │
│  │                    └─────┬──────┘                     │  │
│  │                          │                            │  │
│  │                    ┌─────▼──────┐                     │  │
│  │                    │ API Client │                     │  │
│  │                    │  (Axios)   │                     │  │
│  │                    └─────┬──────┘                     │  │
│  └──────────────────────────┼────────────────────────────┘  │
└─────────────────────────────┼─────────────────────────────┘
                              │ HTTP/HTTPS
                              │ JWT Token
┌─────────────────────────────▼─────────────────────────────┐
│                      Backend API                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │     Auth     │  │   Modules    │  │    Tenants   │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                  │             │
│         └─────────────────┴──────────────────┘             │
│                           │                                │
│                    ┌──────▼───────┐                        │
│                    │   Database   │                        │
│                    │  PostgreSQL  │                        │
│                    └──────────────┘                        │
└────────────────────────────────────────────────────────────┘
```

## Registration Flow

```
User Registration Journey
═══════════════════════════════════════════════════════════

┌─────────────┐
│   Browser   │
│  /register  │
└──────┬──────┘
       │
       │ 1. User fills form
       │    - Company Name
       │    - First/Last Name
       │    - Email
       │    - Password
       │
       ▼
┌──────────────────┐
│  RegisterPage    │
│  Component       │
└──────┬───────────┘
       │
       │ 2. Form submission
       │
       ▼
┌──────────────────┐
│  authApi.register│
│  (API Service)   │
└──────┬───────────┘
       │
       │ 3. POST /api/auth/register
       │    {
       │      companyName,
       │      email,
       │      password,
       │      firstName,
       │      lastName
       │    }
       │
       ▼
┌──────────────────────────────────────┐
│         Backend API                  │
│  ┌────────────────────────────────┐  │
│  │  1. Create Tenant              │  │
│  │     INSERT INTO tenants        │  │
│  │     VALUES (company_name)      │  │
│  └────────────┬───────────────────┘  │
│               │                      │
│  ┌────────────▼───────────────────┐  │
│  │  2. Create Admin Role          │  │
│  │     INSERT INTO roles          │  │
│  │     VALUES ('admin', tenant_id)│  │
│  └────────────┬───────────────────┘  │
│               │                      │
│  ┌────────────▼───────────────────┐  │
│  │  3. Hash Password              │  │
│  │     bcrypt.hash(password, 10)  │  │
│  └────────────┬───────────────────┘  │
│               │                      │
│  ┌────────────▼───────────────────┐  │
│  │  4. Create User                │  │
│  │     INSERT INTO users          │  │
│  │     VALUES (email, hash, ...)  │  │
│  └────────────┬───────────────────┘  │
│               │                      │
│  ┌────────────▼───────────────────┐  │
│  │  5. Assign Role to User        │  │
│  │     INSERT INTO user_roles     │  │
│  │     VALUES (user_id, role_id)  │  │
│  └────────────┬───────────────────┘  │
│               │                      │
│  ┌────────────▼───────────────────┐  │
│  │  6. Generate JWT Token         │  │
│  │     jwt.sign({                 │  │
│  │       sub: user_id,            │  │
│  │       tenant_id,               │  │
│  │       email                    │  │
│  │     })                         │  │
│  └────────────┬───────────────────┘  │
└───────────────┼──────────────────────┘
                │
                │ 7. Return token
                │    { accessToken: "..." }
                │
                ▼
┌──────────────────────────────────────┐
│         Frontend                     │
│  ┌────────────────────────────────┐  │
│  │  1. Decode JWT Token           │  │
│  │     jwtDecode(accessToken)    │  │
│  │     → { sub, tenant_id, email }│  │
│  └────────────┬───────────────────┘  │
│               │                      │
│  ┌────────────▼───────────────────┐  │
│  │  2. Create User Object         │  │
│  │     {                          │  │
│  │       id: sub,                 │  │
│  │       email,                   │  │
│  │       tenantId: tenant_id,     │  │
│  │       role: 'admin'            │  │
│  │     }                          │  │
│  └────────────┬───────────────────┘  │
│               │                      │
│  ┌────────────▼───────────────────┐  │
│  │  3. Store in Zustand           │  │
│  │     setAuth(user, token)       │  │
│  │     → Persisted to localStorage│  │
│  └────────────┬───────────────────┘  │
│               │                      │
│  ┌────────────▼───────────────────┐  │
│  │  4. Navigate to Dashboard      │  │
│  │     navigate('/')              │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

## Data Flow

### Query Flow (Read Operations)

```
Component → useQuery → Service → API Client → Backend → Database
                ↓
            TanStack Query Cache
                ↓
            Component Re-render
```

### Mutation Flow (Write Operations)

```
Component → useMutation → Service → API Client → Backend → Database
                ↓
        Optimistic Update (optional)
                ↓
        Invalidate Query Cache
                ↓
        Refetch Data
                ↓
        Component Re-render
```

## State Management

### Server State (TanStack Query)
- API data
- Caching (5-minute stale time)
- Automatic refetching
- Optimistic updates
- Query invalidation

### Client State (Zustand)
- Authentication (user, token)
- UI state (modals, drawers)
- Persisted to localStorage

### Form State (Ant Design Form)
- Form values
- Validation state
- Field errors

### URL State (React Router)
- Current route
- Query parameters (filters, pagination)

## Service Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    BaseService<T>                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Core Methods:                                    │  │
│  │  - getAll(params)    → Paginated list            │  │
│  │  - getById(id)       → Single record             │  │
│  │  - create(data)      → New record                │  │
│  │  - update(id, data)  → Full update               │  │
│  │  - patch(id, data)   → Partial update            │  │
│  │  - delete(id)        → Remove record             │  │
│  │  - bulkDelete(ids)   → Remove multiple           │  │
│  │  - export(params)    → Download data             │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          │ extends
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌───────────────┐  ┌──────────────┐  ┌──────────────┐
│ ModuleService │  │ UserService  │  │TenantService │
│               │  │              │  │              │
│ + validate    │  │ + changePass │  │ + getUsage   │
│ + duplicate   │  │ + assignRole │  │ + invite     │
│ + getStats    │  │ + getPerms   │  │ + settings   │
└───────────────┘  └──────────────┘  └──────────────┘
```

## Component Hierarchy

```
App
├── AuthLayout
│   ├── LoginPage
│   └── RegisterPage
│       ├── Steps (Ant Design)
│       ├── Form (Company Info)
│       └── Form (User Account)
│
└── MainLayout
    ├── Header
    │   ├── MenuToggle
    │   ├── SearchBar
    │   └── UserDropdown
    │
    ├── Sidebar
    │   └── Menu
    │       ├── Dashboard
    │       ├── Modules
    │       └── Settings
    │
    └── Content
        ├── DashboardPage
        │   ├── Statistics Cards
        │   └── Activity Feed
        │
        ├── ModulesPage
        │   ├── DataTable
        │   └── Module Cards
        │
        ├── ModuleBuilderPage
        │   ├── Form
        │   └── Field Builder
        │
        └── ModuleDataPage
            ├── DataTable
            │   ├── Filters
            │   ├── Sorting
            │   └── Pagination
            ├── DynamicForm (Modal)
            ├── FilterBuilder (Drawer)
            └── BulkImport (Modal)
```

## Security Architecture

### Authentication Layer

```
┌──────────────────────────────────────────────────────┐
│                  API Request                         │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│            Axios Request Interceptor                 │
│  ┌────────────────────────────────────────────────┐  │
│  │  1. Get token from Zustand store              │  │
│  │  2. Add Authorization header                  │  │
│  │     Authorization: Bearer <token>             │  │
│  └────────────────────────────────────────────────┘  │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│                  Backend API                         │
│  ┌────────────────────────────────────────────────┐  │
│  │  1. Verify JWT signature                      │  │
│  │  2. Check token expiration                    │  │
│  │  3. Extract tenant_id from token              │  │
│  │  4. Filter queries by tenant_id               │  │
│  └────────────────────────────────────────────────┘  │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│            Axios Response Interceptor                │
│  ┌────────────────────────────────────────────────┐  │
│  │  If status === 401:                           │  │
│  │    1. Clear auth store                        │  │
│  │    2. Redirect to /auth/login                 │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

## Performance Optimizations

### Caching Strategy

```
┌─────────────────────────────────────────────────────┐
│              TanStack Query Cache                   │
│  ┌───────────────────────────────────────────────┐  │
│  │  Query Key: ['modules', { page: 1, ... }]    │  │
│  │  Stale Time: 5 minutes                        │  │
│  │  Cache Time: 10 minutes                       │  │
│  │  Refetch: On window focus (disabled)          │  │
│  │  Retry: 1 time                                │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Code Splitting

```
App (Main Bundle)
├── Auth Pages (Lazy Loaded)
├── Dashboard (Lazy Loaded)
├── Modules (Lazy Loaded)
└── Settings (Lazy Loaded)
```

### Optimistic Updates

```
User Action (e.g., Delete)
    ↓
Update UI Immediately (Optimistic)
    ↓
Send API Request
    ↓
Success → Keep UI Update
    ↓
Error → Rollback UI Update + Show Error
```

## Technology Stack

### Core
- React 18.2
- TypeScript 5.3
- Vite 5.1

### UI & Styling
- Ant Design 5.14
- Tailwind CSS 3.4
- Ant Design Icons 5.3

### State Management
- TanStack Query 5.20 (Server State)
- Zustand 4.5 (Client State)

### Routing & Navigation
- React Router 6.22

### HTTP & API
- Axios 1.6.7
- JWT Decode 4.0

### Data Processing
- XLSX 0.18.5 (Excel import/export)
- Day.js 1.11.10 (Date manipulation)

### Development
- ESLint 8.56
- TypeScript ESLint 6.21
- Prettier (via .prettierrc)

## Build & Deployment

### Development Build
```bash
npm run dev
# Vite dev server with HMR
# Port: 3000
# API Proxy: /api → http://localhost:3001/api
```

### Production Build
```bash
npm run build
# 1. TypeScript compilation check
# 2. Vite build (optimized)
# 3. Output: dist/
# 4. Assets hashed for caching
# 5. Code splitting applied
```

### Preview Production
```bash
npm run preview
# Serves production build locally
# Port: 4173
```

## Environment Configuration

### Development (.env)
```env
VITE_API_URL=http://localhost:3001/api
```

### Production (.env.production)
```env
VITE_API_URL=https://api.yourdomain.com/api
```

### Staging (.env.staging)
```env
VITE_API_URL=https://api-staging.yourdomain.com/api
```
