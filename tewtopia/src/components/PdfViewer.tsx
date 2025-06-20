'use client';

import { Document, Page, pdfjs } from 'react-pdf';
import { useEffect, useState } from 'react';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PdfViewerProps {
  data: string;
}

export default function PdfViewer({ data }: PdfViewerProps) {
  const [url, setUrl] = useState<string>();
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const byteString = atob(data.trim());
    const byteArray = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      byteArray[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    setUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [data]);

  const onLoad = ({ numPages: nextNumPages }: { numPages: number }) => {
    setNumPages(nextNumPages);
  };

  const zoomOut = () => setScale((s) => Math.max(0.5, s - 0.2));
  const zoomIn = () => setScale((s) => s + 0.2);
  const prev = () => setPageNumber((p) => Math.max(1, p - 1));
  const next = () => setPageNumber((p) => Math.min(numPages, p + 1));
  const download = () => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = 'document.pdf';
    link.click();
  };

  if (!url) return null;

  return (
    <div className="flex h-[80vh] w-full max-w-screen-lg flex-col border shadow">
      <div className="flex items-center gap-2 border-b bg-gray-50 p-2">
        <button onClick={zoomOut} className="rounded border px-2">-</button>
        <button onClick={zoomIn} className="rounded border px-2">+</button>
        <button onClick={prev} className="rounded border px-2">Prev</button>
        <button onClick={next} className="rounded border px-2">Next</button>
        <span className="ml-auto text-sm">
          {pageNumber} / {numPages}
        </span>
        <button onClick={download} className="rounded border px-2">Download</button>
      </div>
      <div className="flex-1 overflow-auto">
        <Document file={url} onLoadSuccess={onLoad} className="flex justify-center">
          <Page pageNumber={pageNumber} scale={scale} />
        </Document>
      </div>
    </div>
  );
}
