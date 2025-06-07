'use client';

import { useState } from 'react';

export default function MainPage() {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex min-h-screen">
      <aside
        className={`${open ? 'w-48' : 'w-12'} bg-gray-800 text-white transition-all`}
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
      <main className="flex-1 p-4">
        <h1 className="text-2xl font-bold mb-4">Main Page</h1>
        <p>Welcome! Use the side menu to navigate.</p>
      </main>
    </div>
  );
}
