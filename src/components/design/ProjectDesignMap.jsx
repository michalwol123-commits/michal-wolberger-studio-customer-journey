import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileUp, ChevronDown, ChevronRight, MapPin } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import DesignItemCard from './DesignItemCard';
import AddDesignItemDialog from './AddDesignItemDialog';
import ImportDesignPDF from './ImportDesignPDF';
import { STATUS_CONFIG } from './designConfig';

export default function ProjectDesignMap({ projectId, stageFilter }) {
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [openRooms, setOpenRooms] = useState(new Set());
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['design-items', projectId],
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

  const handleDelete = async (item) => {
    await base44.entities.DesignItem.delete(item.id);
    queryClient.invalidateQueries({ queryKey: ['design-items', projectId] });
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setShowAdd(true);
  };

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['design-items', projectId] });
    setEditItem(null);
  };

  const toggleRoom = (room) => {
    setOpenRooms(prev => {
      const next = new Set(prev);
      next.has(room) ? next.delete(room) : next.add(room);
      return next;
    });
  };

  // Stats
  const totalItems = filteredItems.length;
  const statusCounts = {};
  filteredItems.forEach(i => { statusCounts[i.status] = (statusCounts[i.status] || 0) + 1; });

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                מפת פרויקט
                {stageFilter && <Badge variant="outline">שלב {stageFilter}</Badge>}
              </h3>
              <div className="flex gap-3 mt-1">
                <span className="text-xs text-muted-foreground">{totalItems} פריטים</span>
                {Object.entries(statusCounts).map(([s, count]) => (
                  <span key={s} className={`text-xs px-1.5 py-0.5 rounded ${STATUS_CONFIG[s]?.color || ''}`}>
                    {STATUS_CONFIG[s]?.label}: {count}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowImport(true)} className="gap-1">
                <FileUp className="w-4 h-4" />ייבוא PDF
              </Button>
              <Button size="sm" onClick={() => { setEditItem(null); setShowAdd(true); }} className="gap-1">
                <Plus className="w-4 h-4" />+ פריט חדש
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rooms */}
      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">טוען...</p>
      ) : roomNames.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {stageFilter ? 'אין פריטים מתוכננים בשלב זה' : 'מפת הפרויקט ריקה'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">הוסיפי פריטים ידנית או ייבאי מ-PDF</p>
          </CardContent>
        </Card>
      ) : (
        roomNames.map(room => {
          const roomItems = rooms[room];
          const isOpen = openRooms.has(room) || roomNames.length <= 3;
          return (
            <Card key={room}>
              <Collapsible open={isOpen} onOpenChange={() => toggleRoom(room)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-heading flex items-center gap-2">
                        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        {room}
                        <Badge variant="secondary" className="text-xs">{roomItems.length}</Badge>
                      </CardTitle>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-2">
                    {roomItems.map(item => (
                      <DesignItemCard key={item.id} item={item} onEdit={handleEdit} onDelete={handleDelete} />
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })
      )}

      <AddDesignItemDialog
        open={showAdd}
        onOpenChange={(v) => { setShowAdd(v); if (!v) setEditItem(null); }}
        projectId={projectId}
        editItem={editItem}
        onSave={handleSaved}
        defaultStage={stageFilter}
      />

      <ImportDesignPDF
        open={showImport}
        onOpenChange={setShowImport}
        projectId={projectId}
        onImported={handleSaved}
      />
    </div>
  );
}