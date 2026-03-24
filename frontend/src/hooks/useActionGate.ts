import { usePermissions } from './usePermissions';

export interface ActionGate {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

/**
 * Returns action flags based on whether the current user is an admin.
 * Non-admin users get all flags as false to disable create/edit/delete actions.
 */
export function useActionGate(): ActionGate {
  const { isAdmin } = usePermissions();

  return {
    canCreate: isAdmin,
    canEdit: isAdmin,
    canDelete: isAdmin,
  };
}
