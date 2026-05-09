import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function BulkDeleteBar({ selectedIds, onDelete, entityLabel = 'פריטים' }) {
  const [open, setOpen] = useState(false);
  const idsRef = React.useRef(selectedIds);
  idsRef.current = selectedIds;

  const handleConfirm = () => {
    const ids = [...idsRef.current];
    setOpen(false);
    onDelete(ids);
  };

  if (selectedIds.length === 0) return null;

  return (
    <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-2 mb-4">
      <span className="text-sm font-medium">{selectedIds.length} {entityLabel} נבחרו</span>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" className="gap-1">
            <Trash2 className="w-4 h-4" />
            מחק {selectedIds.length}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת {selectedIds.length} {entityLabel}</AlertDialogTitle>
            <AlertDialogDescription>
              האם את בטוחה שברצונך למחוק {selectedIds.length} {entityLabel}? פעולה זו אינה ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <Button variant="destructive" onClick={handleConfirm}>
              מחק
            </Button>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}