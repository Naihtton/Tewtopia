'use client';

import { useEffect, useState } from 'react';
import rawPdf from '../pdf/testByteArray';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

export default function MainPage() {
  const [open, setOpen] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string>();
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

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
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-4">Main Page</h1>
          <p className="mb-4">Welcome! Use the side menu to navigate.</p>
          {pdfUrl && (
            <div className="h-[80vh] border">
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                <Viewer fileUrl={pdfUrl} plugins={[defaultLayoutPluginInstance]} />
              </Worker>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
