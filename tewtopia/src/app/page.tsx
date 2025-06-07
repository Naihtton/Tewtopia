import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-100 p-4">
      <h1 className="mb-4 text-center text-4xl font-bold">Welcome to Tewtopia</h1>
      <p className="mb-4 max-w-md text-center">
        Tewtopia connects students with the perfect tutors to help them succeed.
      </p>
      <Link
        href="/auth"
        className="rounded bg-blue-600 py-2 px-4 font-semibold text-white hover:bg-blue-700"
      >
        Get Started
      </Link>
    </main>
  );
}
