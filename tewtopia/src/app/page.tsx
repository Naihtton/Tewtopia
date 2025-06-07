import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-4">Welcome to Tewtopia</h1>
      <p className="mb-4 text-center max-w-md">
        Tewtopia connects students with the perfect tutors to help them succeed.
      </p>
      <Link
        href="/auth"
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
      >
        Get Started
      </Link>
    </main>
  );
}
