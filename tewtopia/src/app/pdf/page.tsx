'use client';

import { useEffect, useRef } from 'react';
import rawPdf from '../../../../testByteArray.ts?raw';

export default function PdfPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const byteString = atob(rawPdf.trim());
    const byteArray = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      byteArray[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }

    return () => URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <iframe ref={iframeRef} className="h-[80vh] w-full" />
    </div>
  );
}
