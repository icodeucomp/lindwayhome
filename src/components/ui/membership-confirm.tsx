"use client";

import { useState } from "react";

import Link from "next/link";

import { guestsApi } from "@/utils";

import { Button } from "@/components";

type Status = "idle" | "loading" | "success" | "error";

export function MembershipConfirm({ guestId }: { guestId: string }) {
  const [status, setStatus] = useState<Status>("idle");

  const { mutate: updateGuest } = guestsApi.useUpdateMembershipGuests({
    onSuccess: () => setStatus("success"),
    onError: () => setStatus("error"),
  });

  function handleConfirm() {
    setStatus("loading");
    updateGuest(guestId);
  }

  function handleDecline() {
    window.location.href = "/";
  }

  const wrapper = "min-h-screen bg-gray-100 flex items-center justify-center px-4";
  const card = "max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center";

  // — Confirmation prompt —
  if (status === "idle") {
    return (
      <div className={wrapper}>
        <div className={card}>
          <div className="mx-auto size-16 bg-gray-200 rounded-full flex items-center justify-center mb-6">
            <svg className="size-8 text-darker-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-darker-gray mb-3">Activate Membership?</h1>
          <p className="text-gray mb-8">
            Do you want to activate your <span className="font-semibold text-darker-gray">Lindway Member</span> account now?
          </p>

          <div className="flex gap-3">
            <Button onClick={handleDecline} className="flex-1 border border-gray-300 text-gray bg-white hover:bg-gray-50 rounded-xl py-2.5 font-medium transition">
              No, later
            </Button>
            <Button onClick={handleConfirm} className="flex-1 bg-darker-gray hover:bg-gray text-white rounded-xl py-2.5 font-medium transition">
              Yes, activate
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // — Loading —
  if (status === "loading") {
    return (
      <div className={wrapper}>
        <div className={card}>
          <div className="mx-auto size-16 bg-gray-200 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <svg className="size-8 text-darker-gray animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
          <p className="text-gray font-medium">Activating your membership...</p>
        </div>
      </div>
    );
  }

  // — Error —
  if (status === "error") {
    return (
      <div className={wrapper}>
        <div className={card}>
          <div className="mx-auto size-16 bg-gray-200 rounded-full flex items-center justify-center mb-6">
            <svg className="size-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-darker-gray mb-3">Something went wrong</h1>
          <p className="text-red-500 mb-8 text-sm">Failed to activate membership. Please try again.</p>
          <div className="flex gap-3">
            <Link href="/" className="flex-1">
              <Button className="w-full border border-gray-300 text-gray bg-white hover:bg-gray-50 rounded-xl py-2.5 font-medium transition">Go Home</Button>
            </Link>
            <Button onClick={() => setStatus("idle")} className="flex-1 bg-darker-gray hover:bg-gray text-white rounded-xl py-2.5 font-medium transition">
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // — Success —
  return (
    <div className={wrapper}>
      <div className={card}>
        <div className="mx-auto size-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <svg className="size-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-darker-gray mb-4">Thank You! 🎉</h1>
        <p className="text-lg text-gray mb-2">Welcome to our store!</p>
        <p className="text-gray mb-8">
          You have successfully joined <span className="font-semibold text-darker-gray capitalize">Lindway Member</span>. We&apos;re excited to have you on board!
        </p>

        <Link href="/">
          <Button className="bg-darker-gray hover:bg-gray text-white w-full rounded-xl py-2.5 font-medium transition">Back to Home</Button>
        </Link>
      </div>
    </div>
  );
}
