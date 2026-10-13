import React from 'react';
import { X } from 'lucide-react';

export default function RemoveSpaceButton({ title, onRemove }) {
  const handle = () => {
    if (window.confirm(`להסיר את ${title}? התשובות שמילאתם בו יימחקו`)) onRemove();
  };
  return (
    <div className="flex justify-end mb-2">
      <button type="button" onClick={handle} className="flex items-center gap-1 text-xs underline" style={{ color: '#8a7060' }}>
        <X className="w-3.5 h-3.5" /> הסרת החלל
      </button>
    </div>
  );
}