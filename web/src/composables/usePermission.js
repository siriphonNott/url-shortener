import { useAuthStore } from '../stores/auth';

export const usePermission = () => {
  const auth = useAuthStore();

  // Returns true only when permissions are loaded AND the flag is explicitly true
  const can = (menu, action = 'view') => {
    if (!auth.permissions) return false;
    return auth.permissions[menu]?.[action] === true;
  };

  // True while permissions haven't been fetched yet (loading state)
  const permissionsLoaded = () => auth.permissions !== null;

  return { can, permissionsLoaded };
};
