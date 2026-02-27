'use client';
import { useEffect, useRef } from 'react';

interface Props {
  value: string;
  width?: number;
  height?: number;
  fontSize?: number;
  className?: string;
}

export default function BarcodeDisplay({ value, width = 2, height = 60, fontSize = 12, className = '' }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!value || !ref.current) return;
    // Dynamically import JsBarcode to avoid SSR issues
    import('jsbarcode').then(({ default: JsBarcode }) => {
      try {
        JsBarcode(ref.current, value, {
          format: 'CODE128',
          width,
          height,
          fontSize,
          margin: 8,
          displayValue: true,
          textMargin: 4,
          font: 'DM Mono, monospace',
        });
      } catch (e) {
        console.error('Barcode error:', e);
      }
    });
  }, [value, width, height, fontSize]);

  if (!value) return null;

  return (
    <div className={`barcode-wrap ${className}`}>
      <svg ref={ref} />
    </div>
  );
}
