import { redirect } from 'next/navigation';
import { SettingsForm } from '@/app/main/settings/_components/settings-form';
import { getCurrentUserSettings } from '@/lib/settings';

export default async function SettingsPage() {
  const result = await getCurrentUserSettings();

  if (!result) {
    redirect('/auth');
  }

  return <SettingsForm initialSettings={result.settings} initialError={result.error} />;
}
