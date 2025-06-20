'use client';

import { useEffect, useState } from 'react';
import rawPdf from '../pdf/testByteArray';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { toolbarPlugin } from '@react-pdf-viewer/toolbar';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/toolbar/lib/styles/index.css';

export default function MainPage() {
  const [open, setOpen] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string>();
  const toolbarPluginInstance = toolbarPlugin();
  const { Toolbar } = toolbarPluginInstance;

  useEffect(() => {
    const byteString = atob(rawPdf.trim());
    const byteArray = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      byteArray[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className={`${open ? 'w-48' : 'w-12'} bg-gray-800 text-white shadow transition-all`}>
        <button onClick={() => setOpen(!open)} className="p-2 focus:outline-none">
          {open ? '<<' : '>>'}
        </button>
        {open && (
          <nav className="mt-4 space-y-2">
            <a href="#" className="block px-4 py-2 hover:bg-gray-700">Dashboard</a>
            <a href="#" className="block px-4 py-2 hover:bg-gray-700">Profile</a>
            <a href="#" className="block px-4 py-2 hover:bg-gray-700">Settings</a>
          </nav>
        )}
      </aside>
      <main className="flex flex-1 bg-white p-6">
        <div className={`relative transition-all ${previewOpen ? 'w-64' : 'w-0'} overflow-hidden border-r`}>
          {pdfUrl && <iframe src={pdfUrl} className="h-full w-full" />}
        </div>
        <div className="flex-1 pl-4">
          <button
            onClick={() => setPreviewOpen(!previewOpen)}
            className="mb-2 rounded border px-2 text-sm"
          >
            {previewOpen ? 'Hide Preview' : 'Show Preview'}
          </button>
          <h1 className="text-2xl font-bold mb-4">Main Page</h1>
          <p className="mb-4">Welcome! Use the side menu to navigate.</p>
          {pdfUrl && (
            <div className="flex h-[80vh] flex-col border">
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                <Toolbar>
                  {(slots) => {
                    const { ZoomOut, ZoomIn, CurrentPageInput, NumberOfPages, Download } = slots;
                    return (
                      <div className="flex items-center gap-2 border-b p-2">
                        <ZoomOut />
                        <ZoomIn />
                        <div className="flex items-center gap-1">
                          <CurrentPageInput /> / <NumberOfPages />
                        </div>
                        <Download />
                      </div>
                    );
                  }}
                </Toolbar>
                <div className="flex-1 overflow-hidden">
                  <Viewer fileUrl={pdfUrl} plugins={[toolbarPluginInstance]} />
                </div>
              </Worker>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
