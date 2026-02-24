# Complete Registration & Login Flow

## Registration Process

### Visual Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER REGISTRATION FLOW                        │
└─────────────────────────────────────────────────────────────────┘

Step 1: Navigate to Registration
─────────────────────────────────
User visits: http://localhost:3000/auth/register

┌──────────────────────────────────────────────────────────────┐
│                     Registration Page                         │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Create Your ERP Account                               │  │
│  │  Start your journey with a powerful ERP system         │  │
│  │                                                         │  │
│  │  [●────○] Company → Account                            │  │
│  │                                                         │  │
│  │  Company Name                                          │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ 🏢 Acme Corporation                              │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │                                                         │  │
│  │  [     Continue     ]                                  │  │
│  │                                                         │  │
│  │  Already have an account? Sign in                      │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘

Step 2: Enter User Details
───────────────────────────
After clicking Continue:

┌──────────────────────────────────────────────────────────────┐
│                     Registration Page                         │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Create Your ERP Account                               │  │
│  │  Start your journey with a powerful ERP system         │  │
│  │                                                         │  │
│  │  [●────●] Company → Account                            │  │
│  │                                                         │  │
│  │  First Name              Last Name                     │  │
│  │  ┌────────────────────┐  ┌────────────────────┐       │  │
│  │  │ 👤 John            │  │ 👤 Doe             │       │  │
│  │  └────────────────────┘  └────────────────────┘       │  │
│  │                                                         │  │
│  │  Email Address                                         │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ ✉️  john@acme.com                                │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │                                                         │  │
│  │  Password                                              │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ 🔒 ••••••••                                      │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │                                                         │  │
│  │  Confirm Password                                      │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ 🔒 ••••••••                                      │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │                                                         │  │
│  │  [  Back  ]  [  Create Account  ]                     │  │
│  │                                                         │  │
│  │  Already have an account? Sign in                      │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘

Step 3: Backend Processing
───────────────────────────
When user clicks "Create Account":

Frontend sends POST request:
┌──────────────────────────────────────────────────────────────┐
│ POST http://localhost:3001/api/auth/register                 │
│                                                               │
│ Request Body:                                                 │
│ {                                                             │
│   "companyName": "Acme Corporation",                         │
│   "email": "john@acme.com",                                  │
│   "password": "password123",                                 │
│   "firstName": "John",                                       │
│   "lastName": "Doe"                                          │
│ }                                                             │
└──────────────────────────────────────────────────────────────┘

Backend processes:
┌──────────────────────────────────────────────────────────────┐
│ 1. Create Tenant                                              │
│    INSERT INTO tenants (id, name)                            │
│    VALUES ('uuid-1', 'Acme Corporation')                     │
│                                                               │
│ 2. Create Admin Role                                          │
│    INSERT INTO roles (id, name, tenant_id)                   │
│    VALUES ('uuid-2', 'admin', 'uuid-1')                      │
│                                                               │
│ 3. Hash Password                                              │
│    hash = bcrypt.hash('password123', 10)                     │
│    → '$2b$10$...'                                            │
│                                                               │
│ 4. Create User                                                │
│    INSERT INTO users (id, email, password, first_name,       │
│                       last_name, tenant_id)                  │
│    VALUES ('uuid-3', 'john@acme.com', hash, 'John',         │
│            'Doe', 'uuid-1')                                  │
│                                                               │
│ 5. Assign Role                                                │
│    INSERT INTO user_roles (user_id, role_id)                 │
│    VALUES ('uuid-3', 'uuid-2')                               │
│                                                               │
│ 6. Generate JWT Token                                         │
│    token = jwt.sign({                                        │
│      sub: 'uuid-3',                                          │
│      tenant_id: 'uuid-1',                                    │
│      email: 'john@acme.com'                                  │
│    }, SECRET, { expiresIn: '7d' })                           │
└──────────────────────────────────────────────────────────────┘

Backend responds:
┌──────────────────────────────────────────────────────────────┐
│ Response (200 OK):                                            │
│ {                                                             │
│   "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." │
│ }                                                             │
└──────────────────────────────────────────────────────────────┘

Step 4: Frontend Processing
────────────────────────────
Frontend receives token and processes:

┌──────────────────────────────────────────────────────────────┐
│ 1. Decode JWT Token                                           │
│    decoded = jwtDecode(accessToken)                         │
│    → {                                                        │
│         sub: 'uuid-3',                                       │
│         tenant_id: 'uuid-1',                                 │
│         email: 'john@acme.com'                               │
│       }                                                       │
│                                                               │
│ 2. Create User Object                                         │
│    user = {                                                   │
│      id: 'uuid-3',                                           │
│      email: 'john@acme.com',                                 │
│      name: 'John Doe',                                       │
│      tenantId: 'uuid-1',                                     │
│      role: 'admin'                                           │
│    }                                                          │
│                                                               │
│ 3. Store in Zustand                                           │
│    setAuth(user, accessToken)                               │
│    → Saved to localStorage as 'auth-storage'                 │
│                                                               │
│ 4. Show Success Message                                       │
│    message.success('Registration successful!')               │
│                                                               │
│ 5. Navigate to Dashboard                                      │
│    navigate('/')                                             │
└──────────────────────────────────────────────────────────────┘

Step 5: User Logged In
──────────────────────
User is now on the dashboard:

┌──────────────────────────────────────────────────────────────┐
│  [☰] ERP System                    John Doe [▼]              │
├──────────────────────────────────────────────────────────────┤
│  📊 Dashboard                                                 │
│  📦 Modules                                                   │
│  ⚙️  Settings                                                 │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                    Dashboard                           │  │
│  │                                                         │  │
│  │  Total Modules: 0    Total Records: 0                 │  │
│  │  Active Users: 1     Growth: 0%                       │  │
│  │                                                         │  │
│  │  Quick Actions:                                        │  │
│  │  • Create New Module                                   │  │
│  │  • View Modules                                        │  │
│  │  • Manage Users                                        │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Login Process

### Visual Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER LOGIN FLOW                           │
└─────────────────────────────────────────────────────────────────┘

Step 1: Navigate to Login
──────────────────────────
User visits: http://localhost:3000/auth/login

┌──────────────────────────────────────────────────────────────┐
│                         Login Page                            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Welcome Back                                          │  │
│  │  Sign in to your ERP account                          │  │
│  │                                                         │  │
│  │  Email                                                 │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ 👤 john@acme.com                                 │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │                                                         │  │
│  │  Password                                              │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ 🔒 ••••••••                                      │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │                                                         │  │
│  │  [        Sign In        ]                            │  │
│  │                                                         │  │
│  │  ─────────── or ───────────                           │  │
│  │                                                         │  │
│  │  Don't have an account? Create one now                │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘

Step 2: Backend Authentication
───────────────────────────────
When user clicks "Sign In":

Frontend sends POST request:
┌──────────────────────────────────────────────────────────────┐
│ POST http://localhost:3001/api/auth/login                    │
│                                                               │
│ Request Body:                                                 │
│ {                                                             │
│   "email": "john@acme.com",                                  │
│   "password": "password123"                                  │
│ }                                                             │
└──────────────────────────────────────────────────────────────┘

Backend processes:
┌──────────────────────────────────────────────────────────────┐
│ 1. Find User by Email                                         │
│    SELECT * FROM users WHERE email = 'john@acme.com'         │
│    → Found user with id 'uuid-3'                             │
│                                                               │
│ 2. Verify Password                                            │
│    isMatch = bcrypt.compare('password123', user.password)    │
│    → true                                                     │
│                                                               │
│ 3. Generate JWT Token                                         │
│    token = jwt.sign({                                        │
│      sub: 'uuid-3',                                          │
│      tenant_id: 'uuid-1',                                    │
│      email: 'john@acme.com'                                  │
│    }, SECRET, { expiresIn: '7d' })                           │
└──────────────────────────────────────────────────────────────┘

Backend responds:
┌──────────────────────────────────────────────────────────────┐
│ Response (200 OK):                                            │
│ {                                                             │
│   "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." │
│ }                                                             │
└──────────────────────────────────────────────────────────────┘

Step 3: Frontend Processing
────────────────────────────
Same as registration steps 4-5

Step 4: User Logged In
──────────────────────
User is redirected to dashboard
```

## Token Usage in API Calls

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATED API CALL                        │
└─────────────────────────────────────────────────────────────────┘

Example: Fetching Modules
──────────────────────────

User Action:
User navigates to Modules page

Frontend Request:
┌──────────────────────────────────────────────────────────────┐
│ GET http://localhost:3001/api/modules                         │
│                                                               │
│ Headers:                                                      │
│   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6...     │
│   Content-Type: application/json                             │
└──────────────────────────────────────────────────────────────┘

Axios Interceptor (Automatic):
┌──────────────────────────────────────────────────────────────┐
│ 1. Get token from Zustand store                              │
│    token = useAuthStore.getState().token                     │
│                                                               │
│ 2. Add Authorization header                                   │
│    config.headers.Authorization = `Bearer ${token}`          │
│                                                               │
│ 3. Send request                                               │
└──────────────────────────────────────────────────────────────┘

Backend Processing:
┌──────────────────────────────────────────────────────────────┐
│ 1. Extract token from Authorization header                   │
│    token = header.split('Bearer ')[1]                        │
│                                                               │
│ 2. Verify JWT signature                                       │
│    decoded = jwt.verify(token, SECRET)                       │
│                                                               │
│ 3. Extract tenant_id                                          │
│    tenant_id = decoded.tenant_id                             │
│                                                               │
│ 4. Query with tenant filter                                   │
│    SELECT * FROM modules WHERE tenant_id = 'uuid-1'          │
│                                                               │
│ 5. Return filtered results                                    │
└──────────────────────────────────────────────────────────────┘

Response:
┌──────────────────────────────────────────────────────────────┐
│ Response (200 OK):                                            │
│ [                                                             │
│   {                                                           │
│     "id": "module-1",                                        │
│     "tenant_id": "uuid-1",                                   │
│     "name": "customers",                                     │
│     "displayName": "Customers",                              │
│     ...                                                       │
│   }                                                           │
│ ]                                                             │
└──────────────────────────────────────────────────────────────┘
```

## Token Expiration & Logout

```
┌─────────────────────────────────────────────────────────────────┐
│                    TOKEN EXPIRATION HANDLING                     │
└─────────────────────────────────────────────────────────────────┘

Scenario: Token Expires
────────────────────────

User makes API call with expired token:
┌──────────────────────────────────────────────────────────────┐
│ GET http://localhost:3001/api/modules                         │
│ Authorization: Bearer <expired_token>                         │
└──────────────────────────────────────────────────────────────┘

Backend Response:
┌──────────────────────────────────────────────────────────────┐
│ Response (401 Unauthorized):                                  │
│ {                                                             │
│   "statusCode": 401,                                         │
│   "message": "Unauthorized"                                  │
│ }                                                             │
└──────────────────────────────────────────────────────────────┘

Axios Response Interceptor (Automatic):
┌──────────────────────────────────────────────────────────────┐
│ 1. Detect 401 status                                          │
│    if (error.response?.status === 401)                       │
│                                                               │
│ 2. Clear auth store                                           │
│    useAuthStore.getState().logout()                          │
│    → Removes user and token from store                       │
│    → Clears localStorage                                      │
│                                                               │
│ 3. Redirect to login                                          │
│    window.location.href = '/auth/login'                      │
└──────────────────────────────────────────────────────────────┘

User sees login page and must sign in again

Manual Logout:
──────────────
User clicks logout button:
┌──────────────────────────────────────────────────────────────┐
│ 1. Call logout function                                       │
│    const { logout } = useAuthStore()                         │
│    logout()                                                   │
│                                                               │
│ 2. Clear state                                                │
│    → user = null                                             │
│    → token = null                                            │
│    → isAuthenticated = false                                 │
│    → localStorage cleared                                     │
│                                                               │
│ 3. Navigate to login                                          │
│    navigate('/auth/login')                                   │
└──────────────────────────────────────────────────────────────┘
```

## Multi-Tenancy Isolation

```
┌─────────────────────────────────────────────────────────────────┐
│                    MULTI-TENANT DATA ISOLATION                   │
└─────────────────────────────────────────────────────────────────┘

Tenant A (Acme Corp):
─────────────────────
User: john@acme.com
Tenant ID: uuid-1
Token: { sub: 'user-1', tenant_id: 'uuid-1', ... }

Queries:
SELECT * FROM modules WHERE tenant_id = 'uuid-1'
→ Returns only Acme Corp's modules

SELECT * FROM users WHERE tenant_id = 'uuid-1'
→ Returns only Acme Corp's users

Tenant B (Beta Inc):
────────────────────
User: jane@beta.com
Tenant ID: uuid-2
Token: { sub: 'user-2', tenant_id: 'uuid-2', ... }

Queries:
SELECT * FROM modules WHERE tenant_id = 'uuid-2'
→ Returns only Beta Inc's modules

SELECT * FROM users WHERE tenant_id = 'uuid-2'
→ Returns only Beta Inc's users

Data Isolation:
───────────────
✅ Tenant A cannot see Tenant B's data
✅ Tenant B cannot see Tenant A's data
✅ Each tenant has isolated modules, users, and data
✅ Backend automatically filters by tenant_id from JWT
✅ No cross-tenant data leakage possible
```

## Summary

### Registration Creates:
1. ✅ New Tenant (Company)
2. ✅ Admin Role for that tenant
3. ✅ Admin User linked to tenant
4. ✅ User-Role assignment
5. ✅ JWT token with tenant context

### Login Validates:
1. ✅ User credentials
2. ✅ Password hash
3. ✅ Generates JWT with tenant context

### Every API Call:
1. ✅ Includes JWT token automatically
2. ✅ Backend extracts tenant_id
3. ✅ Filters all queries by tenant_id
4. ✅ Returns only tenant's data

### Security:
1. ✅ Passwords hashed with bcrypt
2. ✅ JWT tokens signed and verified
3. ✅ Automatic token injection
4. ✅ Auto-logout on expiration
5. ✅ Complete tenant isolation
