import React from 'react';
import '@/components/portal/portal-theme.css';
import ArtIcon from './ArtIcon';

export default function PortalError() {
  return (
    <div className="portal-theme min-h-screen flex items-center justify-center p-4" dir="rtl">
      <div className="p-card max-w-md w-full p-10 text-center">
        <div className="flex justify-center mb-6">
          <ArtIcon name="compass" size={88} />
        </div>
        <p className="p-label mb-2">סטודיו מיכל וולברגר</p>
        <h1 className="p-display text-2xl mb-3">קישור לא תקין</h1>
        <p className="text-sm leading-relaxed" style={{ color: '#8a7060' }}>
          הקישור שקיבלת אינו תקין או שפג תוקפו.
          <br />
          אנא פני למיכל לקבלת קישור חדש.
        </p>
      </div>
    </div>
  );
}