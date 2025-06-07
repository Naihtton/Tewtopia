'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AuthPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you'd authenticate here
    router.push('/main');
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-xs rounded bg-white p-6 shadow">
        <h1 className="text-2xl font-bold mb-4 text-center">Log In</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded border border-gray-300 p-2"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-gray-300 p-2"
            required
          />
          <button
            type="submit"
            className="w-full rounded bg-blue-600 py-2 px-4 font-semibold text-white hover:bg-blue-700"
          >
            Log In
          </button>
        </form>
      </div>
    </main>
  );
}
