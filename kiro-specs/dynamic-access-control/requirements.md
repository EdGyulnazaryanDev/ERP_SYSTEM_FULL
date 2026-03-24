# Dynamic Access Control — Requirements

## Overview

This spec covers the dynamic access control system for the ERP platform. It unifies subscription plan enforcement, role-based page access, and feature gating into a coherent system.

---

## Requirements

### 1. Subscription Plan Enforcement

**1.1** Every tenant must have an active subscription plan. If no plan exists, a default BASIC plan is auto-provisioned.

**1.2** Subscription plans define which feature modules are available (e.g., `accounting`, `warehouse`, `crm`). Core pages (dashboard, products, categories, inventory, transactions, users, settings, rbac) are always available regardless of plan.

**1.3** Only a tenant superadmin (role name = "superadmin") or a global system admin (`isSystemAdmin = true`) can change the tenant's subscription plan.

**1.4** The global system admin (`isSystemAdmin = true`) manages plan definitions (create, update, delete, activate/deactivate plans) via the `/admin/subscription-plans` endpoints.

**1.5** When a tenant's plan changes, page access rules are re-evaluated against the new plan's feature set.

---

### 2. Role Hierarchy

**2.1** The system recognizes the following role hierarchy (highest to lowest):
- **System Admin** (`isSystemAdmin = true`): Global, cross-tenant. Bypasses all guards.
- **Superadmin** (role name normalized to "superadmin"): Tenant-level. Bypasses feature guards, can manage page access and subscription plan.
- **Admin** (role name normalized to "admin"): Can manage page access for non-superadmin roles.
- **Other roles**: Subject to full RBAC + subscription enforcement.

**2.2** Role name matching is case-insensitive and ignores spaces/hyphens/underscores (e.g., "Super Admin", "super-admin", "superadmin" all match).

**2.3** A user may have multiple roles. Permissions are OR-merged across roles (most permissive wins for create/edit/delete/export; AND for view).

---

### 3. Page Access Matrix

**3.1** Each role has a per-page access matrix with flags: `can_view`, `can_create`, `can_edit`, `can_delete`, `can_export`.

**3.2** Page access is AND-ed with subscription plan: if a page requires a feature not in the plan, all permissions are forced to false regardless of role settings.

**3.3** Superadmin and system admin bypass subscription enforcement — they can access all pages.

**3.4** Admins can manage page access for non-superadmin roles. Only superadmin can manage the superadmin role's page access.

**3.5** When `can_view` is disabled for a page, all other permissions (create/edit/delete/export) are also disabled.

**3.6** Default page access initialization sets `can_view = true` for plan-included pages, and `can_create/edit/delete/export = true` only for admin-level roles.

---

### 4. Feature Gating

**4.1** Backend guards (`@RequireFeature`) enforce feature access at the API level. Superadmin and system admin bypass these guards.

**4.2** Frontend sidebar hides pages locked by subscription for non-privileged users.

**4.3** Superadmin and system admin see all pages in the sidebar regardless of subscription.

**4.4** Core pages (inventory, transactions, dashboard, products, categories, users, settings, rbac) are never feature-gated — they are always accessible.

---

### 5. System Admin Full Access

**5.1** A user with `isSystemAdmin = true` has unrestricted access to all pages, all actions, and all admin endpoints.

**5.2** System admin can access the Plan Builder (`/admin/subscription-plans`) to manage plan definitions.

**5.3** System admin is not subject to tenant subscription limits or feature gates.

---

### 6. Functional Correctness

**6.1** `isSuperAdminUser(userId, tenantId)` returns true if the user has `isSystemAdmin = true` OR has a role named "superadmin" within the tenant.

**6.2** `isAdminOrSuperAdminUser(userId, tenantId)` returns true if the user has `isSystemAdmin = true` OR has a role named "superadmin" or "admin" within the tenant.

**6.3** Plan feature changes (via `updatePlan`) take effect immediately for all tenants on that plan.

**6.4** Tenant plan selection (`selectPlan`) cancels the previous subscription and creates a new active one.

---

### 7. Frontend Navigation

**7.1** The sidebar filters menu items based on `canAccessPage(pageKey)` and `isLockedBySubscription(pageKey)`.

**7.2** Privileged users (superadmin, system admin) see all menu items.

**7.3** The user block in the top-right header shows the user's name and their primary role below it.

**7.4** The Plan Builder menu item is only shown to system admins.

---

## Acceptance Criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Superadmin role can change tenant subscription plan | Fixed |
| 2 | Superadmin role can manage page access matrix | Fixed |
| 3 | Core pages (inventory, transactions) always accessible without feature flag | Fixed |
| 4 | `isSuperAdminUser` checks role name, not just `isSystemAdmin` flag | Fixed |
| 5 | System admin has full unrestricted access | Existing |
| 6 | Sidebar hides subscription-locked pages for regular users | Existing |
| 7 | Sidebar shows all pages for privileged users | Existing |
| 8 | Role shown in user block header | Existing |
