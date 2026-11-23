import { Building2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BrandImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export function BrandImage({ src, alt, className = '', fallbackLabel }: BrandImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 text-slate-500 p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Building2 className="w-8 h-8 text-brand-primary/40 mb-2" />
        {fallbackLabel && (
          <span className="text-xs font-medium text-slate-600 line-clamp-2 max-w-[200px]">
            {fallbackLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
