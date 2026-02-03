"use client";

import * as React from "react";

import { Button, Img, Modal } from "@/components";

import { FaEye, FaShoppingCart } from "react-icons/fa";

import { paymentMethodColors, paymentMethodLabels } from "@/static/categories";

import { formatIDR, guestsApi } from "@/utils";

import { ApiResponse, Guest } from "@/types";

interface CartsListsProps {
  guests: Guest[];
  isError: boolean;
  isLoading: boolean;
  isPending: boolean;
  updatePurchase: (guestId: string) => void;
}

export const GuestsLists = ({ guests, isLoading, isPending, isError, updatePurchase }: CartsListsProps) => {
  const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);

  const [selectedGuestId, setSelectedGuestId] = React.useState<string | null>(null);

  const openModal = (guestId: string) => {
    setSelectedGuestId(guestId);
    setIsModalOpen(true);
  };

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
      <div className="flex justify-center items-center py-8">
        <div className="loader"></div>
      </div>
    );
  }

  if (guests.length === 0) {
    return (
      <div className="py-12 text-center">
        <svg className="w-12 h-12 mx-auto text-darker-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray">No guests and carts</h3>
      </div>
    );
  }

  if (isError) {
    return <div className="px-4 py-3 text-red-700 border border-red-200 rounded-lg bg-red-50">Error loading products. Please try again.</div>;
  }

  return (
    <>
      <div className="mb-6 overflow-x-auto rounded-lg">
        <table className="w-full">
          <thead className="text-sm font-medium uppercase border-b bg-light border-gray/30 text-gray">
            <tr>
              <th className="px-6 py-4 tracking-wider text-left">Full Name</th>
              <th className="px-6 py-4 tracking-wider text-left">Email</th>
              <th className="px-6 py-4 tracking-wider text-left">Whatsapp Number</th>
              <th className="px-6 py-4 tracking-wider text-left">Payment Method</th>
              <th className="px-6 py-4 tracking-wider text-left">Purchase Status</th>
              <th className="px-6 py-4 tracking-wider text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y bg-light divide-gray/30">
            {guests.map((guest) => (
              <tr key={guest.id} className="odd:bg-gray/5">
                <td className="px-6 py-3 whitespace-nowrap">
                  <div className="text-sm font-medium">{guest.fullname}</div>
                </td>
                <td className="px-6 py-3 whitespace-nowrap">
                  <div className="text-sm">{guest.email}</div>
                </td>
                <td className="px-6 py-3 whitespace-nowrap">
                  <div className="text-sm">{guest.whatsappNumber}</div>
                </td>
                <td className="px-6 py-3 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${paymentMethodColors[guest.paymentMethod]}`}>{paymentMethodLabels[guest.paymentMethod]}</span>
                </td>
                <td className="px-6 py-3 whitespace-nowrap">
                  {isPending ? (
                    <div className="px-6">
                      <div className="loader-text"></div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updatePurchase(guest.id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${guest.isPurchased ? "bg-green-500" : "bg-red-500"}`}
                        disabled={guest.isPurchased}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${guest.isPurchased ? "translate-x-6" : "translate-x-1"}`} />
                      </button>
                      <span className={`text-xs font-medium ${guest.isPurchased ? "text-green-700" : "text-red-700"}`}>{guest.isPurchased ? "Purchased" : "Pending"}</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-3 whitespace-nowrap">
                  <Button onClick={() => openModal(guest.id)} className="inline-flex items-center gap-1 btn-outline">
                    <FaEye className="size-4" />
                    View Details
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal isVisible={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h3 className="text-2xl font-bold text-gray">Guest Details</h3>
        {loadGuest ? (
          <div className="flex items-center justify-center py-8">
            <div className="loader"></div>
          </div>
        ) : errorGuest ? (
          <div className="px-4 py-3 text-red-700 border border-red-200 rounded-lg bg-red-50">Error loading guest details. Please try again.</div>
        ) : (
          <div className="flex gap-8 mt-4">
            <div className="w-full space-y-4 max-w-64">
              <div className="text-gray">
                <label className="block text-sm font-medium">Address</label>
                <p className="mt-1 text-sm">{guest?.data.address}</p>
              </div>
              <div className="text-gray">
                <label className="block text-sm font-medium">Postal Code</label>
                <p className="mt-1 text-sm">{guest?.data.postalCode}</p>
              </div>
              <div className="text-gray">
                <label className="block text-sm font-medium">Instagram</label>
                <p className="mt-1 text-sm">{guest?.data.instagram || "-"}</p>
              </div>
              <div className="text-gray">
                <label className="block text-sm font-medium">Reference</label>
                <p className="mt-1 text-sm">{guest?.data.reference || "-"}</p>
              </div>
              <div className="text-gray">
                <label className="block text-sm font-medium">Payment Method</label>
                <span className={`mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${paymentMethodColors[guest?.data.paymentMethod as keyof typeof paymentMethodColors]}`}>
                  {paymentMethodLabels[guest?.data.paymentMethod as keyof typeof paymentMethodLabels]}
                </span>
              </div>
              <div className="text-gray">
                <label className="block text-sm font-medium">Purchase Status</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${guest?.data.isPurchased ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {guest?.data.isPurchased ? "Purchased" : "Not Purchased"}
                  </span>
                </div>
              </div>
              {guest?.data.receiptImage && (
                <div className="text-gray">
                  <label className="block mb-2 text-sm font-medium">Receipt Image</label>
                  <Img src={guest?.data.receiptImage.url} alt={guest?.data.receiptImage.alt} className="w-full h-full rounded-lg" width={400} height={400} />
                </div>
              )}
            </div>
            <div className="flex-1">
              {guest?.data.cartItems && guest?.data.cartItems.length > 0 && (
                <div className="text-gray">
                  <div className="flex justify-between items-center">
                    <label className="block mb-2 text-sm font-medium">
                      <FaShoppingCart className="inline w-4 h-4 mr-1" />
                      Items ({guest?.data.totalItemsSold})
                    </label>
                    <label className="block mb-2 text-sm font-medium">Total: {formatIDR(guest?.data.totalPurchased)}</label>
                  </div>
                  <div className="space-y-2">
                    {guest?.data.cartItems.map((item, index) => (
                      <div key={index} className="p-3 rounded-lg bg-gray/5 text-gray">
                        <div className="flex items-center gap-4 text-sm">
                          <div>
                            <span className="font-medium">Product ID:</span>
                            <p className="line-clamp-1">{item.productId}</p>
                          </div>
                          <div>
                            <span className="font-medium">Quantity:</span>
                            <p className="line-clamp-1">{item.quantity}</p>
                          </div>
                          <div>
                            <span className="font-medium">Size:</span>
                            <p className="line-clamp-1">{item.selectedSize}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};
