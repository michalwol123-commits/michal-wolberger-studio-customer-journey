import React, { useEffect, useState } from 'react';

const DEFAULT_BG = 'https://media.base44.com/images/public/69c56d22dada4d9b43006820/171771e17_Image25of71.jpg';

/**
 * סקשן עם תמונת פרויקט ברקע ושטיפת קרם מעליה.
 * plain=true → בלי תמונה בכלל (גרדיאנט קרם).
 * אחרת: imageUrl → תמונת ברירת המחדל של הסטודיו → גרדיאנט קרם.
 */
export default function PortalImageSection({ imageUrl, plain = false, wash = 0.84, className = '', children }) {
  const src = imageUrl || DEFAULT_BG;
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (plain) { setOk(false); return; }
    let alive = true;
    setOk(false);
    const img = new Image();
    img.onload = () => { if (alive) setOk(true); };
    img.onerror = () => { if (alive) setOk(false); };
    img.src = src;
    return () => { alive = false; };
  }, [src, plain]);

  const showImage = ok && !plain;

  return (
    <section
      className={showImage ? 'p-img-section' : 'p-img-fallback'}
      style={showImage ? { backgroundImage: `url('${src}')` } : undefined}
    >
      <div className={className} style={showImage ? { background: `rgba(245,240,235,${wash})` } : undefined}>
        {children}
      </div>
    </section>
  );
}