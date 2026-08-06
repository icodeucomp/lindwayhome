"use client";

import * as React from "react";

import Link from "next/link";

import { useQueryClient } from "@tanstack/react-query";

import { PiArrowUpRight, PiUsers } from "react-icons/pi";

import { useAuthStore, useSearchPagination } from "@/hooks";

import { convertDate, formatIDR, membersApi } from "@/utils";

import { ApiResponse, CreateMember, Member } from "@/types";

import {
  AdminButton,
  Badge,
  ConfirmDialog,
  DataPagination,
  EmptyState,
  ErrorState,
  Field,
  FilterDropdown,
  FilterRow,
  ListToolbar,
  LoadingState,
  PageHeader,
  Panel,
  RowAction,
  SearchBar,
  TableShell,
  Td,
  TextInput,
  Th,
  ToolbarRow,
} from "./slicing";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "true", label: "Active" },
  { value: "false", label: "Revoked" },
];

const FILTER_KEYS = ["isActive"] as const;

interface MembersResponse extends ApiResponse<Member[]> {
  activeCount: number;
}

export const MembersDashboard = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const { searchQuery, inputValue, setInputValue, handleSearch, handleClearSearch, page, limit, handlePageChange, filters, setFilter, resetAll, hasFilters } = useSearchPagination({
    filterKeys: FILTER_KEYS,
    defaultLimit: 20,
  });

  const [form, setForm] = React.useState<CreateMember>({ email: "", fullname: "" });
  const [formError, setFormError] = React.useState("");
  const [toRevoke, setToRevoke] = React.useState<Member | null>(null);
  const [toDelete, setToDelete] = React.useState<Member | null>(null);

  const { data, isLoading, isError, refetch } = membersApi.useGetMembers<MembersResponse>({
    key: ["members", searchQuery, page, limit, filters.isActive],
    enabled: isAuthenticated,
    params: { search: searchQuery, page, limit, isActive: filters.isActive },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["members"] });

  const createMember = membersApi.useCreateMember({
    onSuccess: () => {
      invalidate();
      setForm({ email: "", fullname: "" });
      setFormError("");
    },
  });

  const updateMember = membersApi.useUpdateMember({
    onSuccess: () => {
      invalidate();
      setToRevoke(null);
    },
  });

  const deleteMember = membersApi.useDeleteMember({
    onSuccess: () => {
      invalidate();
      setToDelete(null);
    },
  });

  const members = data?.data ?? [];
  const pagination = data?.pagination;

  const handleGrant = (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.email.trim()) {
      setFormError("An email is required");
      return;
    }

    createMember.mutate({ email: form.email.trim(), fullname: form.fullname?.trim() || null });
  };

  const setActive = (member: Member, isActive: boolean) => updateMember.mutate({ id: member.id, member: { isActive } });

  return (
    <>
      <PageHeader
        eyebrow="Sales"
        title="Members"
        description="Customers who receive the member discount. Revoking stops the discount on their next order; anything they have already bought keeps the price they actually paid."
      />

      {/* Granting by hand is the same upsert the post-order page performs, so an email
          that was revoked before comes back rather than colliding on the unique key. */}
      <Panel className="p-5 mb-8 sm:p-6">
        <p className="mb-5 admin-section-label">Grant membership</p>

        <form onSubmit={handleGrant} className="grid items-start gap-5 sm:grid-cols-[2fr_2fr_auto]">
          <Field label="Email" htmlFor="email" required error={formError} hint="Checkout matches members by this exact address">
            <TextInput
              id="email"
              type="email"
              value={form.email}
              onChange={(event) => {
                setForm((previous) => ({ ...previous, email: event.target.value }));
                setFormError("");
              }}
              invalid={Boolean(formError)}
              placeholder="buyer@example.com"
            />
          </Field>

          <Field label="Full name" htmlFor="fullname" hint="Optional — buyers who join at checkout bring their own">
            <TextInput id="fullname" value={form.fullname ?? ""} onChange={(event) => setForm((previous) => ({ ...previous, fullname: event.target.value }))} placeholder="Rani Pertiwi" />
          </Field>

          <div className="sm:pt-6">
            <AdminButton type="submit" variant="solid" disabled={createMember.isPending}>
              {createMember.isPending ? "Saving…" : "Grant"}
            </AdminButton>
          </div>
        </form>
      </Panel>

      <ListToolbar>
        <SearchBar value={inputValue} onChange={setInputValue} onSearch={handleSearch} onClear={handleClearSearch} placeholder="Search email or name…" />

        <ToolbarRow>
          <FilterRow>
            <FilterDropdown label="Status" value={filters.isActive} options={STATUS_OPTIONS} onChange={(value) => setFilter("isActive", value)} />
            {hasFilters && (
              <AdminButton size="sm" variant="ghost" onClick={resetAll}>
                Clear
              </AdminButton>
            )}
          </FilterRow>

          {pagination && (
            <p className="text-xs text-body/50">
              {pagination.total} {hasFilters ? "matching" : "member" + (pagination.total === 1 ? "" : "s")}
              {data?.activeCount !== undefined && <span className="ml-2 text-body/35">· {data.activeCount} active in total</span>}
            </p>
          )}
        </ToolbarRow>
      </ListToolbar>

      {isLoading ? (
        <LoadingState message="Loading members" />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : members.length === 0 ? (
        <EmptyState
          icon={<PiUsers className="size-6" />}
          title={hasFilters ? "No members match your filters" : "No members yet"}
          description={hasFilters ? "Try a different keyword, or clear the filters." : "Buyers join from the page shown after checkout, or you can grant membership above."}
        />
      ) : (
        <Panel className="overflow-hidden">
          <TableShell>
            <thead className="border-b bg-muted/60 border-border">
              <tr>
                <Th>Member</Th>
                <Th>Status</Th>
                <Th className="text-right">Orders</Th>
                <Th className="text-right">Spent</Th>
                <Th className="text-right">Joined</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {members.map((member) => (
                <tr key={member.id} className="duration-200 hover:bg-muted/40">
                  <Td>
                    <span className="block text-body">{member.fullname || "—"}</span>
                    <span className="block text-xs text-body/50">{member.email}</span>
                  </Td>
                  <Td>
                    <Badge className={member.isActive ? "bg-primary/12 text-primary" : "bg-body/6 text-body/50"}>{member.isActive ? "Active" : "Revoked"}</Badge>
                  </Td>
                  <Td className="text-right tabular-nums">
                    {member.orderCount ? (
                      // Reuses the Orders screen rather than duplicating a list here —
                      // its search already matches on email.
                      <Link href={`/admin/dashboard/orders?search=${encodeURIComponent(member.email)}`} className="inline-flex items-center gap-1 duration-200 text-primary hover:text-body">
                        {member.orderCount}
                        <PiArrowUpRight className="size-3" />
                      </Link>
                    ) : (
                      <span className="text-body/35">0</span>
                    )}
                  </Td>
                  <Td className="text-right whitespace-nowrap tabular-nums">{member.totalSpent ? formatIDR(member.totalSpent) : <span className="text-body/35">—</span>}</Td>
                  <Td className="text-right whitespace-nowrap text-body/50">{convertDate(member.createdAt)}</Td>
                  <Td className="text-right whitespace-nowrap">
                    <div className="flex justify-end gap-4">
                      {member.isActive ? (
                        <RowAction onClick={() => setToRevoke(member)} disabled={updateMember.isPending}>
                          Revoke
                        </RowAction>
                      ) : (
                        <RowAction onClick={() => setActive(member, true)} disabled={updateMember.isPending}>
                          Reinstate
                        </RowAction>
                      )}
                      {/* Only offered when there is nothing to detach — the server
                          refuses otherwise, and an action that always fails is noise. */}
                      {!member.orderCount && (
                        <RowAction tone="danger" onClick={() => setToDelete(member)}>
                          Delete
                        </RowAction>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </Panel>
      )}

      {pagination && <DataPagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} onPageChange={handlePageChange} />}

      <ConfirmDialog
        isVisible={toRevoke !== null}
        tone="primary"
        title={`Revoke membership for ${toRevoke?.email ?? "this member"}?`}
        description="They stop receiving the member rate from their next order. Orders they have already placed keep the price they were charged — this changes nothing about them."
        confirmLabel="Revoke membership"
        isPending={updateMember.isPending}
        onConfirm={() => toRevoke && setActive(toRevoke, false)}
        onClose={() => setToRevoke(null)}
      />

      <ConfirmDialog
        isVisible={toDelete !== null}
        title={`Delete ${toDelete?.email ?? "this member"}?`}
        description="They have never ordered, so nothing is detached. If they had, revoking would be the right action instead."
        confirmLabel="Delete member"
        isPending={deleteMember.isPending}
        onConfirm={() => toDelete && deleteMember.mutate(toDelete.id)}
        onClose={() => setToDelete(null)}
      />
    </>
  );
};
