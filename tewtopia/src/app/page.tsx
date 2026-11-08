import Link from 'next/link';
import { TopNav } from '@/app/_components/top-nav';
import { ui } from '@/lib/ui';

export default function Home() {
  return (
    <div className={`${ui.shell} flex flex-col`}>
      <TopNav user={null} />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className={`${ui.title} max-w-2xl text-4xl md:text-6xl`}>Welcome to Tewtopia</h1>
        <p className="mt-5 max-w-md text-lg leading-8 text-ink-soft">
          Tewtopia connects students with the perfect tutors to help them succeed.
        </p>
        <Link href="/auth" className={`${ui.buttonPrimary} mt-8 px-7 py-3 text-base`}>
          Get Started
        </Link>
      </main>
    </div>
  );
}
