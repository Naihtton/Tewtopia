'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export function LogoutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogout = async () => {
    if (!isSupabaseConfigured()) {
      router.push('/auth');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/auth');
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isSubmitting}
      className="shrink-0 rounded-full px-3 py-2 text-sm font-bold text-muted transition-colors hover:bg-cream hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isSubmitting ? 'Signing out...' : 'Log out'}
    </button>
  );
}
