# Dynamic Access Control — Tasks

## Completed Fixes

- [x] 1. Fix `isSuperAdminUser` to check role name ("superadmin") in addition to `isSystemAdmin` flag
  - [x] 1.1 Add `UserRole` and `Role` repositories to `SubscriptionsService` constructor
  - [x] 1.2 Implement role-based superadmin check in `isSuperAdminUser`
  - [x] 1.3 Implement role-based admin check in `isAdminOrSuperAdminUser`
  - [x] 1.4 Fix `assertSuperAdmin` to throw `ForbiddenException` instead of generic `Error`

- [x] 2. Fix core pages not requiring feature flags
  - [x] 2.1 Remove `requiredFeature` from `inventory` and `transactions` in `DEFAULT_PAGES`

- [x] 3. Fix `RequireFeatureGuard` to also bypass for `isSystemAdmin` flag
  - [x] 3.1 Add `isSystemAdmin` check before role check in `canActivate`

- [x] 4. Fix `PermissionGuard` to bypass for system admin
  - [x] 4.1 Add `isSystemAdmin` early-return in `canActivate`

## Pending

- [ ] 5. Add tenant-level feature override endpoint
  - [ ] 5.1 Allow superadmin to toggle individual features on/off for their tenant (beyond plan defaults)
  - [ ] 5.2 Store overrides in `tenant_feature_overrides` table
  - [ ] 5.3 Expose UI in Access Governance tab

- [ ] 6. Enforce subscription limits
  - [ ] 6.1 Enforce `max_users` limit when creating users
  - [ ] 6.2 Enforce `max_products` limit when creating products
  - [ ] 6.3 Show limit usage in subscription UI
