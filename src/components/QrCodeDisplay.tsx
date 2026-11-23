import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

interface QrCodeDisplayProps {
  value: string;
  size?: number;
  label?: string;
}

export function QrCodeDisplay({ value, size = 160, label = 'QR Code do Cupom' }: QrCodeDisplayProps) {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {
        if (active) setDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center text-xs text-slate-500"
      >
        Gerando QR...
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt={label}
      width={size}
      height={size}
      className="rounded-lg border border-slate-200 bg-white p-1.5"
    />
  );
}
