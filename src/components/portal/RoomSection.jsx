import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';

function Field({ f, form, update, toggleCheckbox }) {
  const v = form[f.id];
  if (f.type === 'text') return <Input placeholder={f.placeholder} value={v || ''} onChange={e => update(f.id, e.target.value)} />;
  if (f.type === 'textarea') return <Textarea placeholder={f.placeholder} value={v || ''} onChange={e => update(f.id, e.target.value)} />;
  if (f.type === 'radio') return (
    <RadioGroup value={v || ''} onValueChange={val => update(f.id, val)} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {f.options.map((o, i) => (
        <div key={o} className="flex items-center gap-2">
          <RadioGroupItem value={o} id={`${f.id}-${i}`} />
          <Label htmlFor={`${f.id}-${i}`} className="cursor-pointer font-normal">{o}</Label>
        </div>
      ))}
    </RadioGroup>
  );
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {f.options.map(o => (
        <label key={o} className="flex items-center gap-2 cursor-pointer">
          <Checkbox checked={(v || []).includes(o)} onCheckedChange={() => toggleCheckbox(f.id, o)} />
          <span className="text-sm">{o}</span>
        </label>
      ))}
    </div>
  );
}

export default function RoomSection({ room, form, update, toggleCheckbox }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base p-display">{room.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {room.fields.map(f => (
          <div key={f.id} className="space-y-2">
            <Label className="text-sm font-medium">{f.label}</Label>
            <Field f={f} form={form} update={update} toggleCheckbox={toggleCheckbox} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}