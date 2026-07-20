import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export default function ProjectNameEditor({ project, canEdit }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: (newName) => base44.entities.Project.update(project.id, { name: newName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditing(false);
      toast.success('שם הפרויקט עודכן');
    },
  });

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) { toast.error('השם לא יכול להיות ריק'); return; }
    saveMutation.mutate(trimmed);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
          className="text-xl font-bold h-10 max-w-xs"
          autoFocus
        />
        <Button size="icon" className="h-8 w-8" onClick={save} disabled={saveMutation.isPending}>
          <Check className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setName(project.name); setEditing(false); }}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group">
      <h1 className="text-2xl font-bold font-heading">{project.name}</h1>
      {canEdit && (
        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground opacity-60 group-hover:opacity-100"
          onClick={() => { setName(project.name); setEditing(true); }} title="עריכת שם הפרויקט">
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      )}
    </div>
  );
}