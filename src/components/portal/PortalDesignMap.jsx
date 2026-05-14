import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, ExternalLink, Phone, ChevronDown, ChevronRight, Image } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CATEGORY_CONFIG, STATUS_CONFIG } from '@/components/design/designConfig';

function PortalDesignItemCard({ item }) {
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.other;
  const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.planned;

  let options = [];
  try { options = typeof item.options === 'string' ? JSON.parse(item.options) : (item.options || []); } catch {}

  return (
    <div className="rounded-xl border border-border p-4 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => setExpanded(!expanded)}>
      <div className="flex items-start gap-3">
        <span className="text-lg shrink-0">{cat.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-sm">{item.title}</h4>
            <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
          </div>
          {item.supplier && (
            <p className="text-xs text-muted-foreground mt-0.5">{item.supplier}</p>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t space-y-3 mr-8">
          {item.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.description}</p>
          )}

          {item.image_urls?.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {item.image_urls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt="" className="h-20 w-20 object-cover rounded-lg border" />
                </a>
              ))}
            </div>
          )}

          {options.length > 0 && (
            <div className="space-y-1">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-3 py-2">
                  <span className="font-medium">{opt.name}</span>
                  {opt.price && <span className="text-muted-foreground">({opt.price})</span>}
                  {opt.link && (
                    <a href={opt.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <ExternalLink className="w-3 h-3" />צפייה
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          מפת פרויקט {stageFilter ? `— שלב ${stageFilter}` : ''}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {roomNames.map(room => {
          const roomItems = rooms[room];
          const isOpen = openRooms.has(room) || roomNames.length <= 3;
          return (
            <Collapsible key={room} open={isOpen} onOpenChange={() => toggleRoom(room)}>
              <CollapsibleTrigger className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <span className="font-medium text-sm flex items-center gap-2">
                  {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  {room}
                  <Badge variant="secondary" className="text-xs">{roomItems.length}</Badge>
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-1">
                {roomItems.map(item => (
                  <PortalDesignItemCard key={item.id} item={item} />
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}