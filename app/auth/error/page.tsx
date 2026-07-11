import Link from "next/link";
import { TriangleAlert } from "lucide-react";

export default async function AuthErrorPage({
  searchParams
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <section className="container-page grid min-h-[70vh] place-items-center py-14">
      <div className="card w-full max-w-lg p-8 text-center">
        <TriangleAlert className="mx-auto text-red-300" size={42} />
        <h1 className="mt-5 text-3xl font-black">Authentication problem</h1>
        <p className="mt-4 leading-7 text-soft">{message ?? "Something went wrong while confirming your account."}</p>
        <Link href="/login" className="btn-primary mt-7">Return to login</Link>
      </div>
    </section>
  );
}
