import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CATEGORY_CONFIG, STATUS_CONFIG } from '@/components/design/designConfig';
import ArtIcon from './ArtIcon';

function PortalDesignItemCard({ item }) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.planned;

  let options = [];
  try { options = typeof item.options === 'string' ? JSON.parse(item.options) : (item.options || []); } catch {}

  return (
    <div className="p-4 cursor-pointer transition-colors" style={{ border: '1px solid #e8e0d8', background: '#fffdfa' }} onClick={() => setExpanded(!expanded)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-medium" style={{ color: '#2a1f18' }}>{item.title}</h4>
            <span className="p-label !text-[10px] px-2 py-0.5" style={{ border: '1px solid #c8bdb2', color: '#8a7060' }}>{status.label}</span>
          </div>
          {item.supplier && (
            <p className="text-xs mt-0.5" style={{ color: '#8a7060' }}>{item.supplier}</p>
          )}
        </div>
        <span className="text-xs shrink-0 transition-transform" style={{ color: '#c8bdb2', transform: expanded ? 'rotate(90deg)' : 'none' }}>←</span>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 space-y-3" style={{ borderTop: '1px solid #e8e0d8' }}>
          {item.description && (
            <p className="text-sm whitespace-pre-wrap" style={{ color: '#4a3728' }}>{item.description}</p>
          )}

          {item.image_urls?.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {item.image_urls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt="" className="h-20 w-20 object-cover" style={{ border: '1px solid #e0d8ce' }} />
                </a>
              ))}
            </div>
          )}

          {options.length > 0 && (
            <div className="space-y-1.5">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2 text-sm px-3 py-2" style={{ background: '#f0ebe4' }}>
                  <span className="font-medium" style={{ color: '#2a1f18' }}>{opt.name}</span>
                  {opt.price && <span style={{ color: '#8a7060' }}>({opt.price})</span>}
                  {opt.link && (
                    <a href={opt.link} target="_blank" rel="noopener noreferrer" className="underline text-xs" style={{ color: '#4a3728' }} onClick={e => e.stopPropagation()}>
                      צפייה ←
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PortalDesignMap({ projectId, stageFilter }) {
  const [openRooms, setOpenRooms] = useState(new Set());

  const { data: items = [] } = useQuery({
    queryKey: ['portal-design-items', projectId],
    queryFn: () => base44.entities.DesignItem.filter({ project_id: projectId }),
  });

  const filteredItems = stageFilter ? items.filter(i => i.stage === stageFilter) : items;

  // Group by room
  const rooms = {};
  filteredItems.forEach(item => {
    const room = item.room || 'כללי';
    if (!rooms[room]) rooms[room] = [];
    rooms[room].push(item);
  });

  const roomNames = Object.keys(rooms).sort();

  const toggleRoom = (room) => {
    setOpenRooms(prev => {
      const next = new Set(prev);
      next.has(room) ? next.delete(room) : next.add(room);
      return next;
    });
  };

  if (filteredItems.length === 0) return null;

  return (
    <div className="p-card">
      <div className="p-6 flex items-center gap-4" style={{ borderBottom: '1px solid #e8e0d8' }}>
        <ArtIcon name="compass" size={48} floatDelay={2} />
        <div>
          <p className="p-label mb-0.5">חלל אחר חלל</p>
          <h3 className="p-display text-lg">מפת פרויקט {stageFilter ? `— שלב ${stageFilter}` : ''}</h3>
        </div>
      </div>
      <div className="p-5 space-y-3">
        {roomNames.map(room => {
          const roomItems = rooms[room];
          const isOpen = openRooms.has(room) || roomNames.length <= 3;
          return (
            <Collapsible key={room} open={isOpen} onOpenChange={() => toggleRoom(room)}>
              <CollapsibleTrigger className="w-full flex items-center justify-between p-3 transition-colors" style={{ background: '#f0ebe4' }}>
                <span className="text-sm flex items-center gap-3" style={{ color: '#2a1f18' }}>
                  <span className="text-xs" style={{ color: '#8a7060', display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>←</span>
                  <span className="p-display">{room}</span>
                  <span className="p-label !text-[10px]">{roomItems.length} פריטים</span>
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-2">
                {roomItems.map(item => (
                  <PortalDesignItemCard key={item.id} item={item} />
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}