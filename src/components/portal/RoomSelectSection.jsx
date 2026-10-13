import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ROOMS } from '@/components/questionnaire/roomQuestions';

export default function RoomSelectSection({ form, toggleCheckbox }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base p-display">החללים בבית</CardTitle>
        <p className="text-sm" style={{ color: '#8a7060' }}>סמנו אילו חללים נכללים בפרויקט, ונשאל עליהם בהמשך. סלון ופינת אוכל כבר כלולים.</p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ROOMS.map(room => (
          <label key={room.id} className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={(form.selected_rooms || []).includes(room.id)}
              onCheckedChange={() => toggleCheckbox('selected_rooms', room.id)}
            />
            <span className="text-sm">{room.title}</span>
          </label>
        ))}
      </CardContent>
    </Card>
  );
}