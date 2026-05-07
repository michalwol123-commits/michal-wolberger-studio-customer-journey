import React from 'react';
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

export default function DeleteButton({ onDelete, entityLabel = 'פריט', size = 'icon' }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size={size} className={size === 'icon' ? 'h-7 w-7 text-destructive hover:text-destructive' : 'text-destructive gap-1'} onClick={e => e.stopPropagation()}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent dir="rtl" onClick={e => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>מחיקת {entityLabel}</AlertDialogTitle>
          <AlertDialogDescription>
            האם את בטוחה שברצונך למחוק {entityLabel} זה? פעולה זו אינה ניתנת לביטול.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row-reverse gap-2">
          <AlertDialogAction onClick={(e) => { e.stopPropagation(); onDelete(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            מחק
          </AlertDialogAction>
          <AlertDialogCancel onClick={e => e.stopPropagation()}>ביטול</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}