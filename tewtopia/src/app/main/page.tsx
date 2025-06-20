'use client';

import { useState } from 'react';
import PdfViewer from '@/components/PdfViewer';
import rawPdf from '../pdf/testByteArray';

export default function MainPage() {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside
        className={`${open ? 'w-48' : 'w-12'} bg-gray-800 text-white shadow transition-all`}
      >
        <button
          onClick={() => setOpen(!open)}
          className="p-2 focus:outline-none"
        >
          {open ? '<<' : '>>'}
        </button>
        {open && (
          <nav className="mt-4 space-y-2">
            <a href="#" className="block px-4 py-2 hover:bg-gray-700">
              Dashboard
            </a>
            <a href="#" className="block px-4 py-2 hover:bg-gray-700">
              Profile
            </a>
            <a href="#" className="block px-4 py-2 hover:bg-gray-700">
              Settings
            </a>
          </nav>
        )}
      </aside>
      <main className="flex-1 p-6 bg-white">
        <h1 className="text-2xl font-bold mb-4">Main Page</h1>
        <p className="mb-4">Welcome! Use the side menu to navigate.</p>
        <PdfViewer data={rawPdf} />
      </main>
    </div>
  );
}
