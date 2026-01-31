import Link from "next/link";

import { prisma } from "@/lib";

import { Button } from "@/components";

async function updateUserMembership(guestId: string) {
  const guest = await prisma.guest.findUnique({ where: { id: guestId } });
  if (!guest) return null;
  await prisma.guest.update({ where: { id: guestId }, data: { isMember: true } });
}

export default async function PaymentSuccessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) return null;

  await updateUserMembership(id);

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-light rounded-2xl shadow-xl p-8 text-center">
        <div className="mx-auto size-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <svg className="size-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray mb-4">Thank You! 🎉</h1>

        <p className="text-lg text-gray mb-2">Welcome to our store!</p>

        <p className="text-gray mb-8">
          You have successfully joined to <span className="font-semibold text-blue-600 capitalize">Lindway Member</span>. We&apos;re excited to have you on board!
        </p>

        <Link href="/">
          <Button className="btn-blue w-full">Back to Home</Button>
        </Link>
      </div>
    </div>
  );
}
