'use client';

import rawPdf from './testByteArray';
import PdfViewer from '@/components/PdfViewer';

export default function PdfPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <PdfViewer data={rawPdf} />
    </div>
  );
}
