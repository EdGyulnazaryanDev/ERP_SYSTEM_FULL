# Authentication & Registration Guide

## Overview

The ERP system uses JWT-based authentication with multi-tenant support. Each registration creates a new tenant (company) and the first user becomes the admin.

## Registration Flow

### Step 1: Company Information
Users provide their company name, which creates a new tenant in the system.

### Step 2: User Account
Users create their admin account with:
- First Name
- Last Name
- Email (used for login)
- Password (minimum 6 characters)

### Backend Process
When a user registers:
1. A new `Tenant` is created with the company name
2. An `admin` role is created for that tenant
3. A `User` is created and linked to the tenant
4. The user is assigned the admin role
5. A JWT token is generated and returned

## Login Flow

### User Login
Users log in with:
- Email
- Password

### Backend Process
1. User credentials are validated
2. Password is compared using bcrypt
3. JWT token is generated with payload:
   ```json
   {
     "sub": "user_id",
     "tenant_id": "tenant_id",
     "email": "user@email.com"
   }
   ```
4. Token is returned to frontend

### Frontend Process
1. Token is decoded to extract user information
2. User data and token are stored in Zustand store
3. Store is persisted to localStorage
4. User is redirected to dashboard

## API Endpoints

### POST /auth/register
Register a new tenant and admin user.

**Request Body:**
```json
{
  "companyName": "Acme Corporation",
  "email": "admin@acme.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### POST /auth/login
Login with existing credentials.

**Request Body:**
```json
{
  "email": "admin@acme.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Token Management

### Storage
- Token is stored in Zustand store
- Store is persisted to localStorage
- Token survives page refresh

### Usage
- Token is automatically injected in all API requests via Axios interceptor
- Format: `Authorization: Bearer <token>`

### Expiration
- Token expiration is configured in backend (JWT_ACCESS_EXPIRES_IN)
- On 401 response, user is automatically logged out and redirected to login

## Multi-Tenancy

### Tenant Isolation
- Each tenant has isolated data
- Tenant ID is included in JWT token
- Backend filters all queries by tenant_id
- Users can only access data from their own tenant

### First User
- First user to register for a tenant becomes admin
- Admin can invite additional users
- Admin has full permissions within their tenant

## Security Features

### Password Security
- Passwords are hashed using bcrypt (10 rounds)
- Passwords must be at least 6 characters
- Password confirmation required during registration

### Token Security
- JWT tokens are signed with secret key
- Tokens include tenant_id to prevent cross-tenant access
- Tokens have expiration time

### API Security
- All protected routes require valid JWT token
- Invalid tokens result in 401 Unauthorized
- Expired tokens automatically log out user

## Usage Examples

### Registration Component
```typescript
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';

const registerMutation = useMutation({
  mutationFn: authApi.register,
  onSuccess: (response) => {
    const decoded = jwtDecode(response.data.accessToken);
    const user = {
      id: decoded.sub,
      email: decoded.email,
      tenantId: decoded.tenant_id,
      role: 'admin',
    };
    setAuth(user, response.data.accessToken);
    navigate('/');
  },
});

// Submit registration
registerMutation.mutate({
  companyName: 'Acme Corp',
  email: 'admin@acme.com',
  password: 'password123',
  firstName: 'John',
  lastName: 'Doe',
});
```

### Login Component
```typescript
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';

const loginMutation = useMutation({
  mutationFn: authApi.login,
  onSuccess: (response) => {
    const decoded = jwtDecode(response.data.accessToken);
    const user = {
      id: decoded.sub,
      email: decoded.email,
      tenantId: decoded.tenant_id,
    };
    setAuth(user, response.data.accessToken);
    navigate('/');
  },
});

// Submit login
loginMutation.mutate({
  email: 'admin@acme.com',
  password: 'password123',
});
```

### Protected Route
```typescript
import { useAuthStore } from '@/store/authStore';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }
  
  return children;
}
```

### Logout
```typescript
import { useAuthStore } from '@/store/authStore';

function LogoutButton() {
  const { logout } = useAuthStore();
  
  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };
  
  return <Button onClick={handleLogout}>Logout</Button>;
}
```

## Testing

### Test Registration
1. Navigate to `/auth/register`
2. Enter company name: "Test Company"
3. Enter user details:
   - First Name: "Test"
   - Last Name: "User"
   - Email: "test@test.com"
   - Password: "password123"
4. Click "Create Account"
5. Should redirect to dashboard

### Test Login
1. Navigate to `/auth/login`
2. Enter credentials:
   - Email: "test@test.com"
   - Password: "password123"
3. Click "Sign In"
4. Should redirect to dashboard

### Test Token Persistence
1. Login successfully
2. Refresh the page
3. Should remain logged in
4. Token should still be valid

### Test Logout
1. Click logout button
2. Should redirect to login page
3. Token should be cleared
4. Accessing protected routes should redirect to login

## Troubleshooting

### "Invalid credentials" error
- Check email and password are correct
- Ensure user exists in database
- Check backend logs for errors

### Token not persisting
- Check localStorage in browser DevTools
- Look for 'auth-storage' key
- Ensure Zustand persist middleware is configured

### 401 Unauthorized errors
- Check token is being sent in Authorization header
- Verify token hasn't expired
- Check backend JWT secret matches

### Registration fails
- Check all required fields are provided
- Ensure password meets minimum length (6 characters)
- Check email format is valid
- Verify backend database connection

## Database Schema

### Tenants Table
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  domain VARCHAR UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR NOT NULL,
  password VARCHAR NOT NULL,
  first_name VARCHAR,
  last_name VARCHAR,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Roles Table
```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### User_Roles Table
```sql
CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);
```
