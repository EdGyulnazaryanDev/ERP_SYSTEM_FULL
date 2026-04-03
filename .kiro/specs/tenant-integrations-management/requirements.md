# Requirements Document

## Introduction

The Tenant & Platform Integrations Management System extends the existing integrations module to support multi-tenant integration lifecycle management. It introduces:

- Tenant admin self-service for connecting and managing integrations within their subscription limits
- Platform admin control over which integrations are visible/available per tenant (integration builder)
- Audit trail so platform admins are notified when a tenant connects or disconnects an integration
- Plan/subscription enforcement that limits how many integrations a tenant can connect based on their active plan

The system builds on the existing NestJS multi-tenancy architecture, RBAC/permissions system, subscription/plan module, and compliance-audit module.

---

## Glossary

- **Platform_Admin**: A user with `isSystemAdmin = true`; has global access across all tenants
- **Tenant_Admin**: A user with the `superadmin` or `admin` role within a specific tenant
- **Tenant_Manager**: A user with the `manager` role within a specific tenant; may be granted integration management permissions by the Platform_Admin
- **Integration_Service**: A third-party service (e.g. Slack, Stripe, GitHub) that can be connected to a tenant
- **Integration_Catalog**: The global registry of all available Integration_Services managed by the Platform_Admin
- **Tenant_Integration**: A record representing a specific tenant's active connection to an Integration_Service
- **Integration_Visibility**: A per-tenant or global flag set by the Platform_Admin that controls whether an Integration_Service appears in the tenant's integrations page
- **Integration_Limit**: The maximum number of Tenant_Integrations a tenant may have active simultaneously, as defined by their subscription plan
- **Integration_Audit_Log**: An immutable record written to the compliance-audit module whenever a Tenant_Integration is connected or disconnected
- **Integration_Builder**: The Platform_Admin UI and API for managing the Integration_Catalog and per-tenant Integration_Visibility settings
- **Plan_Limit**: A numeric ceiling stored in `SubscriptionPlanLimit` for a given `PlanLimitKey`

---

## Requirements

### Requirement 1: Tenant Admin Integration Management

**User Story:** As a Tenant_Admin, I want to connect, view, and disconnect integrations from my tenant's integrations page, so that I can extend my ERP with third-party services.

#### Acceptance Criteria

1. WHEN a Tenant_Admin requests the list of integrations, THE Integration_Service SHALL return only Integration_Services whose Integration_Visibility is enabled for that tenant.
2. WHEN a Tenant_Admin submits a connect request for an Integration_Service, THE System SHALL verify the tenant has not exceeded their Integration_Limit before creating the Tenant_Integration.
3. IF a tenant has reached their Integration_Limit, THEN THE System SHALL return an HTTP 403 response with a message indicating the plan limit has been exceeded.
4. WHEN a Tenant_Admin successfully connects an Integration_Service, THE System SHALL create a Tenant_Integration record with status `connected` and write an Integration_Audit_Log entry.
5. WHEN a Tenant_Admin disconnects a Tenant_Integration, THE System SHALL update the Tenant_Integration status to `disconnected` and write an Integration_Audit_Log entry.
6. THE System SHALL enforce RBAC by requiring the `integrations:manage` permission for connect and disconnect operations performed by a Tenant_Admin.
7. WHILE a Tenant_Integration has status `connected`, THE System SHALL include it in the tenant's active integration count when evaluating Integration_Limit.

---

### Requirement 2: Platform Admin Integration Management

**User Story:** As a Platform_Admin, I want to connect, view, and manage integrations on behalf of any tenant, so that I can support tenants and perform administrative operations.

#### Acceptance Criteria

1. THE Platform_Admin SHALL have access to all tenant integration management endpoints without being subject to Integration_Limit enforcement.
2. WHEN a Platform_Admin connects or disconnects a Tenant_Integration on behalf of a tenant, THE System SHALL write an Integration_Audit_Log entry that records both the acting Platform_Admin user ID and the target tenant ID.
3. THE System SHALL protect all Platform_Admin integration endpoints with the `SystemAdminGuard`.
4. WHERE a Tenant_Manager has been granted the `integrations:manage` permission by a Platform_Admin, THE System SHALL allow the Tenant_Manager to connect and disconnect integrations subject to the same Integration_Limit rules as a Tenant_Admin.

---

### Requirement 3: Integration Audit Log

**User Story:** As a Platform_Admin, I want to see an audit trail of all tenant integration connect and disconnect events, so that I can monitor integration activity across all tenants.

#### Acceptance Criteria

1. WHEN a Tenant_Integration is connected or disconnected by any actor, THE Integration_Audit_Log SHALL record: tenant ID, Integration_Service key, action (`connected` or `disconnected`), actor user ID, actor role, and timestamp.
2. THE Platform_Admin SHALL be able to query Integration_Audit_Log entries filtered by tenant ID, Integration_Service key, action type, and date range.
3. THE System SHALL write Integration_Audit_Log entries using the existing `ComplianceAuditService.createAuditLog` method with `entity_type = 'tenant_integration'`.
4. IF writing the Integration_Audit_Log entry fails, THEN THE System SHALL not roll back the Tenant_Integration state change, but SHALL log the failure to the application error log.
5. THE Integration_Audit_Log entries SHALL be immutable; THE System SHALL not expose any update or delete endpoint for Integration_Audit_Log entries to non-system actors.

---

### Requirement 4: Plan-Based Integration Limits

**User Story:** As a Platform_Admin, I want to define how many integrations each subscription plan allows, so that integration access is tied to the tenant's plan tier.

#### Acceptance Criteria

1. THE System SHALL introduce `integrations` as a new `PlanLimitKey` value in the subscription constants.
2. WHEN a tenant attempts to connect an Integration_Service, THE System SHALL call `SubscriptionsService.assertWithinLimit` with `PlanLimitKey.INTEGRATIONS` and the tenant's current active Tenant_Integration count.
3. IF a plan's `integrations` limit value is `null`, THEN THE System SHALL treat it as unlimited and allow the connection without restriction.
4. THE Platform_Admin SHALL be able to set the `integrations` limit when creating or updating a subscription plan via the existing plan CRUD endpoints.
5. WHEN a tenant's plan is downgraded and their active Tenant_Integration count exceeds the new plan's Integration_Limit, THE System SHALL not automatically disconnect existing integrations but SHALL prevent new connections until the count is within the new limit.

---

### Requirement 5: Integration Builder — Catalog Management

**User Story:** As a Platform_Admin, I want to manage the global Integration_Catalog, so that I can control which Integration_Services are available on the platform.

#### Acceptance Criteria

1. THE Platform_Admin SHALL be able to create, update, and delete Integration_Service entries in the Integration_Catalog.
2. WHEN an Integration_Service is created, THE System SHALL require: a unique `key` (slug), a `name`, a `category`, and a `logoUrl`.
3. IF an Integration_Service is deleted while one or more tenants have an active Tenant_Integration for it, THEN THE System SHALL return an HTTP 409 response and SHALL not delete the Integration_Service.
4. THE System SHALL protect all Integration_Catalog management endpoints with the `SystemAdminGuard`.
5. THE Integration_Catalog SHALL support pagination when returning the list of Integration_Services, with a default page size of 20.

---

### Requirement 6: Integration Builder — Tenant Visibility Control

**User Story:** As a Platform_Admin, I want to toggle which Integration_Services are visible to each tenant, so that I can curate the integrations available in each tenant's integrations page.

#### Acceptance Criteria

1. THE Platform_Admin SHALL be able to set a global default visibility (`enabled` or `disabled`) for each Integration_Service in the Integration_Catalog.
2. THE Platform_Admin SHALL be able to override the global default visibility for a specific tenant, enabling or disabling individual Integration_Services per tenant.
3. WHEN a tenant requests their integrations list, THE System SHALL resolve visibility by applying the tenant-specific override if one exists, otherwise falling back to the global default.
4. WHEN the Platform_Admin toggles visibility for an Integration_Service, THE System SHALL persist the change and return the updated Integration_Service record with the new visibility state.
5. THE Integration_Builder UI SHALL display Integration_Services as cards, with each card containing the integration name, logo, category, and a toggle control for enabling or disabling tenant visibility.
6. WHEN the Platform_Admin enables or disables an Integration_Service's visibility, THE System SHALL reflect the change in the tenant's integrations list within one request cycle (no caching delay beyond the current request).

---

### Requirement 7: Integration Builder — Platform Admin UI (Card-Based)

**User Story:** As a Platform_Admin, I want a card-based integration management interface, so that I can efficiently browse and toggle integration visibility across the catalog.

#### Acceptance Criteria

1. THE Integration_Builder UI SHALL render each Integration_Service as a card displaying: logo, name, category, and a toggle button.
2. THE toggle button on each card SHALL reflect the current visibility state (`enabled` = on, `disabled` = off) for the selected tenant context.
3. WHEN the Platform_Admin activates the toggle on a card, THE Integration_Builder UI SHALL optimistically update the toggle state and send a PATCH request to the visibility endpoint.
4. IF the PATCH request fails, THEN THE Integration_Builder UI SHALL revert the toggle to its previous state and display an error notification.
5. THE Integration_Builder UI SHALL support filtering cards by category and searching by integration name.
6. THE Integration_Builder UI SHALL display the total count of enabled integrations out of the total catalog size (e.g. "10 / 100 enabled").
