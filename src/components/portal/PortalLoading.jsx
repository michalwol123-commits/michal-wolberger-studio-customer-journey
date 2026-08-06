import React from 'react';
import '@/components/portal/portal-theme.css';

export default function PortalLoading() {
  return (
    <div className="portal-theme min-h-screen flex items-center justify-center" dir="rtl">
      <div className="text-center">
        <div
          className="w-10 h-10 rounded-full animate-spin mx-auto mb-5"
          style={{ border: '2px solid #e0d8ce', borderTopColor: '#2a1f18' }}
        />
        <p className="p-label">טוען את הפורטל שלך...</p>
      </div>
    </div>
  );
}