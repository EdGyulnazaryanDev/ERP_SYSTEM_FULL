import { test, expect } from '@playwright/test';

const ROUTES = [
    // Core Modules
    { name: 'Dashboard', path: '/' },
    { name: 'Products & Services', path: '/products' },
    { name: 'Suppliers', path: '/suppliers' },
    { name: 'Users', path: '/users' },
    { name: 'Categories', path: '/categories' },
    { name: 'Modules Configuration', path: '/modules' },
    { name: 'Module Builder', path: '/modules/builder' },
    { name: 'Roles & Permissions', path: '/rbac' },
    { name: 'Settings', path: '/settings' },

    // Transactions
    { name: 'Transactions', path: '/transactions' },
    { name: 'Transaction Create', path: '/transactions/create' },
    { name: 'Transaction Analytics', path: '/transactions/analytics' },

    // Inventory
    { name: 'Inventory', path: '/inventory' },
    { name: 'Inventory Create', path: '/inventory/create' },

    // Transportation
    { name: 'Transportation', path: '/transportation' },
    { name: 'Shipments', path: '/transportation/shipments' },
    { name: 'Shipment Create', path: '/transportation/shipments/create' },
    { name: 'Couriers', path: '/transportation/couriers' },

    // Operations
    { name: 'Accounting', path: '/accounting' },
    { name: 'Human Resources', path: '/hr' },
    { name: 'CRM', path: '/crm' },
    { name: 'Procurement', path: '/procurement' },
    { name: 'Warehouse', path: '/warehouse' },
    { name: 'Projects', path: '/projects' },
    { name: 'Manufacturing', path: '/manufacturing' },

    // Equipment module (renamed from Assets to avoid Vite static dir collision)
    { name: 'Equipment', path: '/equipment' },

    { name: 'Payments', path: '/payments' },
    { name: 'Communication', path: '/communication' },
    { name: 'Compliance', path: '/compliance' },
    { name: 'BI & Reports', path: '/bi' },
    { name: 'Services', path: '/services' },
];

test.describe('ERP System Smoke Tests', () => {
    // We use a single test to login first and then iterate through routes
    test('Login and visit every module', async ({ page }) => {
        console.log('Starting Smoke Test...');

        // 1. Go to Login Page
        await page.goto('http://localhost:5173/auth/login');

        // 2. Perform Quick Login
        await page.getByRole('button', { name: 'Quick Test Login' }).click();

        // Wait for navigation to dashboard
        await expect(page).toHaveURL('http://localhost:5173/');
        console.log('✅ Successfully logged in');

        // 3. Loop through all routes and verify they load without crashing
        for (const route of ROUTES) {
            console.log(`Navigating to ${route.name} (${route.path})...`);

            // Navigate directly via URL to ensure we hit the routing level
            await page.goto(`http://localhost:5173${route.path}`);

            // Wait for network to be somewhat quiet
            await page.waitForLoadState('domcontentloaded');

            // Basic assertion to ensure the page body contains some text (meaning it didn't white-screen crash)
            const content = await page.locator('body').innerText();
            expect(content?.length).toBeGreaterThan(50); // Body has enough text

            console.log(`✅ Loaded ${route.name}`);
        }

        console.log('🎉 All modules successfully loaded without crashing!');
    });
});
