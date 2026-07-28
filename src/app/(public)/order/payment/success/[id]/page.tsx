import { MembershipConfirm } from "@/components/ui";

export default async function PaymentSuccessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) return null;

  return <MembershipConfirm guestId={id} />;
}
