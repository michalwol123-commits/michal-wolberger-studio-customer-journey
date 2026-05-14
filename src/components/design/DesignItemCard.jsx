import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, ExternalLink, Phone, ChevronDown, ChevronUp, Image } from 'lucide-react';
import { CATEGORY_CONFIG, STATUS_CONFIG } from './designConfig';

export default function DesignItemCard({ item, onEdit, onDelete, readOnly = false }) {
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.other;
  const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.planned;

  let options = [];
  try { options = typeof item.options === 'string' ? JSON.parse(item.options) : (item.options || []); } catch {}

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className="text-xl shrink-0 mt-0.5">{cat.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-sm">{item.title}</h4>
                <Badge variant="outline" className="text-xs">{cat.label}</Badge>
                <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                {item.priority === 'nice_to_have' && (
                  <Badge variant="secondary" className="text-xs">נחמד שיהיה</Badge>
                )}
              </div>
              {item.supplier && (
                <p className="text-xs text-muted-foreground mt-1">
                  {item.supplier}
                  {item.supplier_phone && (
                    <a href={`tel:${item.supplier_phone}`} className="inline-flex items-center gap-1 mr-2 text-primary hover:underline">
                      <Phone className="w-3 h-3" />{item.supplier_phone}
                    </a>
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            {!readOnly && (
              <>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit?.(item)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete?.(item)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-3">
            {item.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.description}</p>
            )}

            {/* Images */}
            {item.image_urls?.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {item.image_urls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt="" className="h-20 w-20 object-cover rounded-lg border hover:opacity-80 transition-opacity" />
                  </a>
                ))}
              </div>
            )}

            {/* Options */}
            {options.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">אופציות:</p>
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg px-3 py-2">
                    <span className="font-medium">{opt.name}</span>
                    {opt.price && <span className="text-muted-foreground">({opt.price})</span>}
                    {opt.link && (
                      <a href={opt.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />קישור
                      </a>
                    )}
                    {opt.notes && <span className="text-xs text-muted-foreground">{opt.notes}</span>}
                  </div>
                ))}
              </div>
            )}

            {item.notes && (
              <p className="text-xs text-muted-foreground italic">{item.notes}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}