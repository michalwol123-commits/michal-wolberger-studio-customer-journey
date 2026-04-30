import React from 'react';
import { Badge } from '@/components/ui/badge';

const CATEGORY_LABELS = {
  carpenter: 'נגר',
  electrician: 'חשמלאי',
  plumber: 'אינסטלטור',
  painter: 'צבעי',
  ac: 'מזגנים',
  kitchen: 'מטבח',
  flooring: 'ריצוף',
  stainless: 'נירוסטה',
  glass: 'זגגות',
  textile: 'טקסטיל',
  lighting: 'תאורה',
  contractor: 'קבלן',
  other: 'אחר',
};

export const categoryLabel = (cat) => CATEGORY_LABELS[cat] || cat;

export default function SupplierCategoryBadge({ category }) {
  return (
    <Badge variant="outline" className="text-xs">
      {categoryLabel(category)}
    </Badge>
  );
}