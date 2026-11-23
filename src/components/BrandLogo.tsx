import { useEffect, useState } from 'react';
import type { BrandConfig } from '../types.ts';

interface BrandLogoProps {
  brand: BrandConfig;
  variant?: 'main' | 'compact' | 'icon';
  className?: string;
}

export function BrandLogo({ brand, variant = 'main', className }: BrandLogoProps) {
  const src =
    variant === 'compact'
      ? brand.logoCompactUrl || brand.logoMainUrl
      : variant === 'icon'
        ? brand.logoIconUrl || brand.logoCompactUrl || brand.logoMainUrl
        : brand.logoMainUrl;

  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const sizeClass =
    className ||
    (variant === 'compact'
      ? 'h-9 w-auto'
      : variant === 'icon'
        ? 'h-8 w-8'
        : 'h-14 sm:h-16 w-auto');

  if (!src || failed) {
    const fallbackBox =
      variant === 'compact'
        ? 'h-9 px-2.5 text-xs'
        : variant === 'icon'
          ? 'h-8 w-8 text-[11px]'
          : 'h-14 px-4 text-sm';

    return (
      <div
        className={`inline-flex items-center justify-center rounded-lg bg-brand-primary text-white font-display font-bold tracking-tight shrink-0 ${fallbackBox}`}
        aria-label={brand.institutionName}
      >
        {brand.institutionAcronym || 'ASSOC'}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={brand.institutionName}
      onError={() => setFailed(true)}
      className={`${sizeClass} object-contain rounded shrink-0`}
    />
  );
}
