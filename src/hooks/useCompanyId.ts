'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile } from '@/lib/services';

/**
 * Shared hook — resolves company_id for the current user.
 * Avoids duplicate profile lookups across modules.
 * Uses the centralized service cache.
 */
export function useCompanyId() {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCompanyId(null);
      setLoading(false);
      return;
    }

    const directCompanyId =
      user?.user_metadata?.company_id ??
      user?.app_metadata?.company_id ??
      null;

    if (directCompanyId) {
      setCompanyId(directCompanyId);
      setLoading(false);
      return;
    }

    let cancelled = false;
    getUserProfile(user?.id)?.then((profile) => {
      if (!cancelled) {
        setCompanyId(profile?.company_id ?? null);
        setLoading(false);
      }
    })?.catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user]);

  return { companyId, loading, userId: user?.id ?? null };
}
