import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function useCurrentUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff';

  return { user, loading, isAdmin, isStaff };
}