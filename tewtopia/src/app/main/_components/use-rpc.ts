'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type RpcResult = PromiseLike<{ error: { message: string } | null }>;

/**
 * Runs one of the request/offer database functions, then refreshes the server
 * data on the page. Errors are the database's own messages (written for users).
 */
export function useRpc() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(call: (client: ReturnType<typeof createClient>) => RpcResult): Promise<boolean> {
    setBusy(true);
    setError(null);
    const { error: rpcError } = await call(createClient());
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return false;
    }
    router.refresh();
    return true;
  }

  return { run, busy, error, setError };
}
