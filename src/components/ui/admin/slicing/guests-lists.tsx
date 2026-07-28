"use client";

import * as React from "react";

import { Button, Img, Modal } from "@/components";

import { FaCheck, FaEye, FaShoppingCart, FaUsers } from "react-icons/fa";

import { Badge, EmptyState, ErrorState, LoadingState, Panel, Spinner, TableShell, Td, Th } from "./ui";

import { paymentMethodColors, paymentMethodLabels } from "@/static/categories";

import { formatIDR, guestsApi } from "@/utils";

import { ApiResponse, Guest } from "@/types";

interface GuestsListsProps {
  guests: Guest[];
  isError: boolean;
  isLoading: boolean;
  hasFilters: boolean;
  pendingGuestId: string | null;
  onRequestPurchase: (guest: Guest) => void;
}

const PurchaseStatus = ({ guest, isPending, onRequestPurchase }: { guest: Guest; isPending: boolean; onRequestPurchase: (guest: Guest) => void }) => {
  if (guest.isPurchased) {
    return (
      <Badge className="text-green-700 bg-green-100">
        <FaCheck className="size-3" />
        Purchased
      </Badge>
    );
  }

  return (
    <Button
      onClick={() => onRequestPurchase(guest)}
      disabled={isPending}
      className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-100 rounded-full hover:bg-amber-200 disabled:opacity-60"
    >
      {isPending ? <Spinner className="border-amber-800/30 border-t-amber-800" /> : <span className="rounded-full size-2 bg-amber-500" />}
      {isPending ? "Updating..." : "Mark as paid"}
    </Button>
  );
};

const DetailRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <p className="text-xs font-semibold tracking-wide uppercase text-gray/60">{label}</p>
    <div className="mt-1 text-sm text-gray">{children}</div>
  </div>
);

export const GuestsLists = ({ guests, isLoading, isError, hasFilters, pendingGuestId, onRequestPurchase }: GuestsListsProps) => {
  const [selectedGuestId, setSelectedGuestId] = React.useState<string | null>(null);

  const {
    data: guest,
    isLoading: loadGuest,
    isError: errorGuest,
  } = guestsApi.useGetGuest<ApiResponse<Guest>>({
    key: ["guest", selectedGuestId],
    id: selectedGuestId || "",
    enabled: selectedGuestId !== null,
  });

  if (isLoading) {
    return (
      <Panel className="mb-6">
        <LoadingState message="Loading guests..." />
      </Panel>
    );
  }

  if (isError) {
    return (
      <Panel className="mb-6">
        <ErrorState message="We couldn't load the guest list. Please check your connection and try again." />
      </Panel>
    );
  }

  if (guests.length === 0) {
    return (
      <Panel className="mb-6">
        <EmptyState
          icon={<FaUsers className="size-6" />}
          title={hasFilters ? "No guests match your filters" : "No guests yet"}
          description={hasFilters ? "Try a different keyword or switch the transaction filter." : "Guests will appear here as soon as they start filling their carts."}
        />
      </Panel>
    );
  }

  const detail = guest?.data;

  return (
    <>
      {/* Table — medium screens and up */}
      <Panel className="hidden mb-6 overflow-hidden lg:block">
        <TableShell>
          <thead className="border-b bg-gray/5 border-gray/15">
            <tr>
              <Th>Full Name</Th>
              <Th>Email</Th>
              <Th>Whatsapp Number</Th>
              <Th>Payment Method</Th>
              <Th>Purchase Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray/10">
            {guests.map((item) => (
              <tr key={item.id} className="duration-300 hover:bg-gray/5">
                <Td className="font-medium whitespace-nowrap text-darker-gray">
                  <div className="flex items-center gap-2">
                    {item.fullname}
                    {item.isMember && <Badge className="bg-purple-100 text-purple-700">Member</Badge>}
                  </div>
                </Td>
                <Td className="whitespace-nowrap">{item.email}</Td>
                <Td className="whitespace-nowrap">{item.whatsappNumber}</Td>
                <Td>
                  <Badge className={paymentMethodColors[item.paymentMethod]}>{paymentMethodLabels[item.paymentMethod]}</Badge>
                </Td>
                <Td>
                  <PurchaseStatus guest={item} isPending={pendingGuestId === item.id} onRequestPurchase={onRequestPurchase} />
                </Td>
                <Td className="text-right">
                  <Button onClick={() => setSelectedGuestId(item.id)} className="inline-flex items-center gap-2 btn-outline">
                    <FaEye className="size-4" />
                    View Details
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </Panel>

      {/* Cards — small screens */}
      <div className="grid gap-4 mb-6 sm:grid-cols-2 lg:hidden">
        {guests.map((item) => (
          <Panel key={item.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold truncate text-darker-gray">{item.fullname}</p>
                <p className="text-sm truncate text-gray/70">{item.email}</p>
              </div>
              {item.isMember && <Badge className="text-purple-700 bg-purple-100">Member</Badge>}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className={paymentMethodColors[item.paymentMethod]}>{paymentMethodLabels[item.paymentMethod]}</Badge>
              <PurchaseStatus guest={item} isPending={pendingGuestId === item.id} onRequestPurchase={onRequestPurchase} />
            </div>

            <p className="text-sm text-gray/70">{item.whatsappNumber}</p>

            <Button onClick={() => setSelectedGuestId(item.id)} className="flex items-center justify-center w-full gap-2 btn-outline">
              <FaEye className="size-4" />
              View Details
            </Button>
          </Panel>
        ))}
      </div>

      <Modal isVisible={selectedGuestId !== null} onClose={() => setSelectedGuestId(null)}>
        <h3 className="pr-10 text-2xl font-bold text-darker-gray">Guest Details</h3>

        {loadGuest ? (
          <LoadingState message="Loading guest details..." />
        ) : errorGuest ? (
          <ErrorState message="We couldn't load this guest's details. Please try again." />
        ) : (
          <div className="grid gap-6 mt-6 md:grid-cols-[minmax(0,16rem)_1fr]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={paymentMethodColors[detail?.paymentMethod as keyof typeof paymentMethodColors]}>{paymentMethodLabels[detail?.paymentMethod as keyof typeof paymentMethodLabels]}</Badge>
                <Badge className={detail?.isPurchased ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"}>{detail?.isPurchased ? "Purchased" : "Not Purchased"}</Badge>
                {detail?.isMember && <Badge className="text-purple-700 bg-purple-100">Member</Badge>}
              </div>

              <div className="p-4 space-y-4 rounded-lg bg-gray/5">
                <DetailRow label="Full Name">{detail?.fullname}</DetailRow>
                <DetailRow label="Email">{detail?.email}</DetailRow>
                <DetailRow label="Whatsapp">{detail?.whatsappNumber}</DetailRow>
                <DetailRow label="Address">{detail?.address}</DetailRow>
                <DetailRow label="Postal Code">{detail?.postalCode}</DetailRow>
                <DetailRow label="Instagram">{detail?.instagram || "-"}</DetailRow>
                <DetailRow label="Reference">{detail?.reference || "-"}</DetailRow>
              </div>

              {detail?.receiptImage && (
                <div>
                  <p className="mb-2 text-xs font-semibold tracking-wide uppercase text-gray/60">Receipt Image</p>
                  <Img src={detail.receiptImage.url} alt={detail.receiptImage.alt} className="w-full border rounded-lg border-gray/15" width={400} height={400} />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 font-semibold text-darker-gray">
                  <FaShoppingCart className="size-4 text-gray/60" />
                  Items ({detail?.totalItemsSold ?? 0})
                </p>
                <p className="text-sm text-gray">
                  Total: <span className="font-bold text-darker-gray">{formatIDR(detail?.totalPurchased ?? 0)}</span>
                </p>
              </div>

              {detail?.cartItems && detail.cartItems.length > 0 ? (
                <div className="space-y-2">
                  {detail.cartItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-3 gap-3 p-3 text-sm border rounded-lg border-gray/15">
                      <div className="col-span-3 sm:col-span-1">
                        <p className="text-xs font-semibold tracking-wide uppercase text-gray/60">Product ID</p>
                        <p className="font-mono text-xs truncate text-gray">{item.productId}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold tracking-wide uppercase text-gray/60">Quantity</p>
                        <p className="text-gray">{item.quantity}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold tracking-wide uppercase text-gray/60">Size</p>
                        <p className="text-gray">{item.selectedSize}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="p-4 text-sm text-center rounded-lg text-gray/60 bg-gray/5">This guest has no items in their cart.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};
