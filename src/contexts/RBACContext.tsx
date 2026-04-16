'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface ModulePermission {
  moduleId: string;
  moduleName: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface RBACContextValue {
  permissions: ModulePermission[];
  loading: boolean;
  isAdmin: boolean;
  canView: (moduleName: string) => boolean;
  canCreate: (moduleName: string) => boolean;
  canEdit: (moduleName: string) => boolean;
  canDelete: (moduleName: string) => boolean;
  hasAnyAccess: (moduleName: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const RBACContext = createContext<RBACContextValue>({
  permissions: [],
  loading: true,
  isAdmin: false,
  canView: () => true,
  canCreate: () => true,
  canEdit: () => true,
  canDelete: () => true,
  hasAnyAccess: () => true,
  refreshPermissions: async () => {},
});

export const useRBAC = () => useContext(RBACContext);

export const RBACProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<ModulePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setPermissions([]);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    // Check if admin via metadata
    const userRole = user?.user_metadata?.role || user?.app_metadata?.role;
    if (userRole === 'admin') {
      setIsAdmin(true);
      setPermissions([]);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/permissions', {
        method: 'GET',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to load permissions.');
      }

      const data = await response.json();
      setIsAdmin(Boolean(data?.isAdmin));
      setPermissions(Array.isArray(data?.permissions) ? data.permissions : []);
    } catch (err) {
      console.error('Failed to fetch RBAC permissions:', err);
      setPermissions([]);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchPermissions();
    }
  }, [authLoading, fetchPermissions]);

  const getModulePerm = (moduleName: string): ModulePermission | undefined => {
    return permissions.find(
      (p) => p.moduleName.toLowerCase() === moduleName.toLowerCase()
    );
  };

  const canView = (moduleName: string): boolean => {
    if (isAdmin) return true;
    const perm = getModulePerm(moduleName);
    return perm?.canView ?? false;
  };

  const canCreate = (moduleName: string): boolean => {
    if (isAdmin) return true;
    const perm = getModulePerm(moduleName);
    return perm?.canCreate ?? false;
  };

  const canEdit = (moduleName: string): boolean => {
    if (isAdmin) return true;
    const perm = getModulePerm(moduleName);
    return perm?.canEdit ?? false;
  };

  const canDelete = (moduleName: string): boolean => {
    if (isAdmin) return true;
    const perm = getModulePerm(moduleName);
    return perm?.canDelete ?? false;
  };

  const hasAnyAccess = (moduleName: string): boolean => {
    if (isAdmin) return true;
    const perm = getModulePerm(moduleName);
    if (!perm) return false;
    return perm.canView || perm.canCreate || perm.canEdit || perm.canDelete;
  };

  return (
    <RBACContext.Provider
      value={{
        permissions,
        loading,
        isAdmin,
        canView,
        canCreate,
        canEdit,
        canDelete,
        hasAnyAccess,
        refreshPermissions: fetchPermissions,
      }}
    >
      {children}
    </RBACContext.Provider>
  );
};
