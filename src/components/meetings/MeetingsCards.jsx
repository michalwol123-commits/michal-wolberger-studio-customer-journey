import React from 'react';
import StatusBadge from '@/components/shared/StatusBadge';
import DeleteButton from '@/components/shared/DeleteButton';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, User, Clock, MapPin, Phone, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

const typeLabels = {
  intro: 'שיחת טלפון ראשונית', qualifying: 'אפיון', quote_presentation: 'היכרות והצגת הצעת מחיר',
  stage_review: 'סקירת שלב', site_visit: 'ביקור אתר', zoom: 'Zoom', design_approval: 'אישור עיצוב'
};

export default function MeetingsCards({ meetings, clientMap, onEdit, onDelete, onComplete, selectedIds, onToggleSelect, isAdmin }) {
  return (
    <div className="space-y-3">
      {meetings.map(m => {
        const client = clientMap[m.client_id];
        return (
          <Card key={m.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onEdit?.(m)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {isAdmin && (
                    <div onClick={e => e.stopPropagation()} className="pt-0.5">
                      <Checkbox checked={selectedIds?.includes(m.id)} onCheckedChange={() => onToggleSelect?.(m.id)} />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium">{typeLabels[m.type] || m.type}</span>
                      <StatusBadge status={m.status} />
                    </div>
                    {m.summary && <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{m.summary}</p>}
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                      {client && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />{client.name}
                        </span>
                      )}
                      {client?.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /><span dir="ltr">{client.phone}</span>
                        </span>
                      )}
                      {m.scheduled_at ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{format(new Date(m.scheduled_at), 'dd/MM/yyyy', { locale: he })}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600">
                          <Calendar className="w-3 h-3" />טרם נקבע תאריך
                        </span>
                      )}
                      {m.scheduled_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />{format(new Date(m.scheduled_at), 'HH:mm')} • {m.duration} דק׳
                        </span>
                      )}
                      {m.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{m.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  {m.status === 'scheduled' && onComplete && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => onComplete(m)} title="סמן כהושלם">
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                  )}
                  {isAdmin && <DeleteButton onDelete={() => onDelete?.(m.id)} entityLabel="פגישה" />}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}