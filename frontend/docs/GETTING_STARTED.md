# Getting Started Guide

## Quick Start

### 1. Install Dependencies

```bash
cd ERP_SYSTEM_FRONT
npm install
```

### 2. Configure Environment

Create `.env` file:
```env
VITE_API_URL=http://localhost:3001/api
```

### 3. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## First Time Setup

### Register Your Company

1. Navigate to `http://localhost:3000/auth/register`
2. Fill in the registration form:
   - **Step 1: Company Information**
     - Company Name: Your company name
   - **Step 2: Account Details**
     - First Name: Your first name
     - Last Name: Your last name
     - Email: Your email (used for login)
     - Password: At least 6 characters
     - Confirm Password: Must match password
3. Click "Create Account"
4. You'll be automatically logged in and redirected to the dashboard

### What Happens During Registration?

- A new tenant (company) is created in the system
- Your user account is created and linked to the tenant
- You're assigned the "admin" role automatically
- A JWT token is generated and stored
- You're logged in and can start using the system

## Using the System

### Dashboard

After login, you'll see the dashboard with:
- Statistics overview
- Quick actions
- Recent activity

### Creating Modules

1. Navigate to "Modules" from the sidebar
2. Click "Create Module"
3. Fill in module details:
   - Module Name: Internal name (e.g., "customers")
   - Display Name: User-facing name (e.g., "Customers")
   - Description: Optional description
4. Add fields:
   - Click "Add Field"
   - Configure field properties:
     - Field name (internal)
     - Display name (user-facing)
     - Type (text, number, date, etc.)
     - Required checkbox
5. Click "Create Module"

### Managing Module Data

1. Go to "Modules" page
2. Click "Data" on any module
3. You'll see a table with:
   - All records
   - Filtering options
   - Sorting capabilities
   - Search functionality
4. Actions available:
   - **Add Record**: Create new data
   - **Edit**: Modify existing records
   - **Delete**: Remove records
   - **Import**: Bulk import from Excel/CSV
   - **Export**: Download data as Excel/CSV

### Advanced Features

#### Filtering Data
1. Click "Advanced Filters" button
2. Add filter conditions:
   - Select field
   - Choose operator (equals, contains, greater than, etc.)
   - Enter value
3. Click "Apply"

#### Bulk Import
1. Click "Import" button
2. Upload Excel or CSV file
3. Map file columns to module fields
4. Review and confirm import
5. Data is imported in bulk

#### Export Data
1. Apply any filters you want
2. Click "Export" button
3. Choose format (Excel or CSV)
4. File downloads automatically

## User Management

### Inviting Users (Coming Soon)
As an admin, you can invite additional users to your tenant:
1. Go to Settings > Users
2. Click "Invite User"
3. Enter email and select role
4. User receives invitation email

### Roles & Permissions
- **Admin**: Full access to all features
- **User**: Standard access (configurable)
- **Viewer**: Read-only access (configurable)

## Common Tasks

### Creating a Customer Module

```typescript
// Module Configuration
{
  name: "customers",
  displayName: "Customers",
  description: "Customer management",
  fields: [
    {
      name: "name",
      displayName: "Customer Name",
      type: "text",
      required: true
    },
    {
      name: "email",
      displayName: "Email",
      type: "email",
      required: true
    },
    {
      name: "phone",
      displayName: "Phone",
      type: "phone",
      required: false
    },
    {
      name: "status",
      displayName: "Status",
      type: "select",
      required: true,
      validation: {
        options: ["active", "inactive"]
      }
    }
  ]
}
```

### Creating a Product Module

```typescript
// Module Configuration
{
  name: "products",
  displayName: "Products",
  description: "Product catalog",
  fields: [
    {
      name: "name",
      displayName: "Product Name",
      type: "text",
      required: true
    },
    {
      name: "sku",
      displayName: "SKU",
      type: "text",
      required: true,
      unique: true
    },
    {
      name: "price",
      displayName: "Price",
      type: "number",
      required: true,
      validation: {
        min: 0
      }
    },
    {
      name: "stock",
      displayName: "Stock Quantity",
      type: "number",
      required: true,
      validation: {
        min: 0
      }
    },
    {
      name: "category",
      displayName: "Category",
      type: "select",
      required: true,
      validation: {
        options: ["Electronics", "Clothing", "Food", "Other"]
      }
    }
  ]
}
```

## Tips & Best Practices

### Module Design
- Use clear, descriptive names
- Mark essential fields as required
- Use appropriate field types
- Add validation rules for data quality

### Data Management
- Use filters to find specific records
- Export data regularly for backups
- Use bulk import for large datasets
- Review data before bulk operations

### Performance
- Use pagination for large datasets
- Apply filters to reduce data load
- Cache is automatically managed
- Queries are optimized by the system

### Security
- Use strong passwords (8+ characters)
- Don't share login credentials
- Log out when finished
- Review user permissions regularly

## Keyboard Shortcuts

- `Ctrl/Cmd + K`: Quick search (coming soon)
- `Ctrl/Cmd + N`: New record (coming soon)
- `Esc`: Close modals

## Troubleshooting

### Can't Login
- Check email and password
- Ensure backend is running
- Check browser console for errors
- Clear browser cache and try again

### Module Not Saving
- Check all required fields are filled
- Ensure field names are unique
- Check browser console for errors
- Verify backend connection

### Import Failing
- Check file format (Excel or CSV)
- Ensure column mapping is correct
- Verify data types match field types
- Check for required fields

### Data Not Loading
- Check internet connection
- Verify backend is running
- Check browser console for errors
- Try refreshing the page

## Next Steps

1. **Create Your First Module**: Start with a simple module like "Customers"
2. **Add Some Data**: Create a few records manually
3. **Try Filtering**: Use the filter builder to find specific records
4. **Import Data**: Try bulk importing from Excel
5. **Explore Features**: Check out all the available features

## Support

For issues or questions:
- Check the documentation in `/docs`
- Review the examples in `EXAMPLES.md`
- Check the API documentation in `API_SERVICES.md`
- Review authentication guide in `AUTHENTICATION.md`

## Development

### Project Structure
```
src/
├── api/              # API client and endpoints
├── components/       # Reusable components
├── hooks/            # Custom React hooks
├── layouts/          # Layout components
├── pages/            # Page components
├── services/         # Service layer
├── store/            # State management
├── types/            # TypeScript types
└── utils/            # Utility functions
```

### Adding New Features
1. Create service in `src/services/`
2. Add types in `src/types/`
3. Create page in `src/pages/`
4. Add route in `src/App.tsx`
5. Use existing hooks and components

### Building for Production
```bash
npm run build
npm run preview
```
