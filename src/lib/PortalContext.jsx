import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const PortalContext = createContext();

export function PortalProvider({ children }) {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) {
      setError(true);
      setLoading(false);
      return;
    }
    loadClient(token);
  }, []);

  const loadClient = async (token) => {
    const clients = await base44.entities.Client.filter({ portal_token: token });
    if (clients.length === 0) {
      setError(true);
    } else {
      setClient(clients[0]);
    }
    setLoading(false);
  };

  return (
    <PortalContext.Provider value={{ client, loading, error }}>
      {children}
    </PortalContext.Provider>
  );
}

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortal must be used within PortalProvider');
  return ctx;
}