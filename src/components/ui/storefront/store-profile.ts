"use client";

import { configParametersApi } from "@/utils";

/**
 * Reader for the `store_profile` config group (§B4.7).
 *
 * Bank details and contact numbers were hardcoded in `payment-step.tsx` in v1 (A9.12);
 * they now live in config and are read here so How to Shop, Contact and the checkout
 * step all show the same numbers. The shapes are defensive because a partially seeded
 * database is a real state — `ShippingService` already fails silently the same way, and
 * a page rendering nothing beats a page throwing.
 */

export interface BankAccount {
  bank: string;
  holder: string;
  number: string;
  branch?: string;
  swift?: string;
}

export interface Assistant {
  name: string;
  whatsapp: string;
}

export interface ContactLinks {
  address?: string;
  maps?: string;
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  assistants?: Assistant[];
}

interface StoreProfile {
  bankAccounts: BankAccount[];
  contact: ContactLinks;
  isLoading: boolean;
}

export const useStoreProfile = (): StoreProfile => {
  const { data, isLoading } = configParametersApi.useGetConfigParametersPublic<{ success: boolean; data: Record<string, unknown> }>({
    key: ["store-profile"],
    keyParams: ["bank_accounts", "contact_links"],
  });

  const values = data?.data ?? {};

  return {
    bankAccounts: Array.isArray(values.bank_accounts) ? (values.bank_accounts as BankAccount[]) : [],
    contact: (values.contact_links as ContactLinks) ?? {},
    isLoading,
  };
};
