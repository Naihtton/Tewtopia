import { redirect } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/profiles';
import { createClient } from '@/lib/supabase/server';
import { ui } from '@/lib/ui';
import { NewRequestForm } from './_components/new-request-form';

export default async function NewRequestPage() {
  const result = await getCurrentUserProfile();

  if (!result) {
    redirect('/auth?next=/main/requests/new');
  }
  if (result.profile.role !== 'student') {
    redirect('/requests');
  }

  // Subject choices come from the shared subjects table (create_request checks against it).
  const supabase = await createClient();
  const { data: subjectRows } = await supabase.from('subjects').select('name').order('name');

  return (
    <div className="flex-1 space-y-6">
      <div>
        <h1 className={`${ui.title} text-4xl md:text-5xl`}>Post a request</h1>
        <p className="mt-3 max-w-2xl text-base text-muted">
          Describe what you need. Tutors on the request board will send you offers with their price.
        </p>
      </div>
      <NewRequestForm subjects={(subjectRows ?? []).map((row) => row.name)} initialContacts={result.profile.contacts} />
    </div>
  );
}
