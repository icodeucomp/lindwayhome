"use client";

import * as React from "react";

import { useQueryClient } from "@tanstack/react-query";

import { PiEnvelopeSimple } from "react-icons/pi";

import { useAuthStore, useSearchPagination } from "@/hooks";

import { INQUIRY_STATUS_SEQUENCE, inquiryStatusColors, inquiryStatusDots, inquiryStatusLabels, inquiryTypeLabels, inquiryTypeOptions, nextStatuses } from "@/static/inquiry";

import { contactInquiriesApi, convertDate } from "@/utils";

import { ContactInquiry, ContactInquiryListResponse, InquiryStatus } from "@/types";

import {
  AdminButton,
  Badge,
  ConfirmDialog,
  DataPagination,
  EmptyState,
  ErrorState,
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
  TextArea,
  Th,
  ToolbarRow,
} from "./slicing";

const FILTER_KEYS = ["status", "inquiryType"] as const;

/* -------------------------------------------------------------------------- */
/*                                Detail panel                                */
/* -------------------------------------------------------------------------- */

const DetailRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="py-2.5 border-b border-border/70 last:border-b-0">
    <p className="admin-field-label">{label}</p>
    <div className="mt-1 text-sm break-words text-body/80">{children || "—"}</div>
  </div>
);

const InquiryDetail = ({ inquiry, onClose, onDelete }: { inquiry: ContactInquiry; onClose: () => void; onDelete: (inquiry: ContactInquiry) => void }) => {
  const queryClient = useQueryClient();

  const [note, setNote] = React.useState(inquiry.handlingNote ?? "");
  const [loadedId, setLoadedId] = React.useState(inquiry.id);

  // Selecting a different row reuses this component, so the note follows the row —
  // derived during render, never in an effect.
  if (loadedId !== inquiry.id) {
    setLoadedId(inquiry.id);
    setNote(inquiry.handlingNote ?? "");
  }

  const update = contactInquiriesApi.useUpdateContactInquiry({
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contact-inquiries"] }),
  });

  const moveTo = (status: InquiryStatus) => update.mutate({ id: inquiry.id, inquiry: { status, handlingNote: note.trim() || null } });

  return (
    <Panel className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 mb-4 border-b border-border">
        <div className="min-w-0">
          <p className="admin-eyebrow">{inquiryTypeLabels[inquiry.inquiryType]}</p>
          <h2 className="mt-1 text-xl font-normal font-heading text-body">{inquiry.fullname}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={inquiryStatusColors[inquiry.status]}>{inquiryStatusLabels[inquiry.status]}</Badge>
          <RowAction onClick={onClose}>Close</RowAction>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,15rem)_1fr]">
        <div>
          <DetailRow label="Email">
            <a href={`mailto:${inquiry.email}`} className="duration-200 text-primary hover:text-body">
              {inquiry.email}
            </a>
          </DetailRow>
          <DetailRow label="Phone">{inquiry.phone}</DetailRow>
          {inquiry.inquiryType === "OTHER" && <DetailRow label="About">{inquiry.otherDetail}</DetailRow>}
          <DetailRow label="Received">{convertDate(inquiry.createdAt)}</DetailRow>
          {inquiry.handledAt && (
            <DetailRow label="Handled">
              {convertDate(inquiry.handledAt)}
              {inquiry.handledBy?.username && <span className="block text-body/50">by {inquiry.handledBy.username}</span>}
            </DetailRow>
          )}
        </div>

        <div>
          <p className="mb-2 admin-field-label">Message</p>
          <p className="p-4 text-sm whitespace-pre-wrap rounded-sm bg-muted text-body/80">{inquiry.message}</p>

          <div className="mt-5">
            <p className="mb-2 admin-field-label">Handling note</p>
            <TextArea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="What did you do about this? Saved with the next status change." />
            <p className="mt-1.5 text-xs text-body/50">HANDLED on its own records that an inquiry was closed but not how — this is the how (D23).</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-4 mt-5 border-t border-border">
            {nextStatuses[inquiry.status].map((status) => (
              <AdminButton key={status} size="sm" variant={status === "HANDLED" ? "solid" : "outline"} disabled={update.isPending} onClick={() => moveTo(status)}>
                {status === "ARCHIVED" ? "Archive" : status === "IN_PROGRESS" && inquiry.status === "ARCHIVED" ? "Reopen" : `Mark ${inquiryStatusLabels[status].toLowerCase()}`}
              </AdminButton>
            ))}

            <span className="ml-auto">
              <RowAction tone="danger" onClick={() => onDelete(inquiry)}>
                Delete
              </RowAction>
            </span>
          </div>
        </div>
      </div>
    </Panel>
  );
};

/* -------------------------------------------------------------------------- */
/*                                    Inbox                                   */
/* -------------------------------------------------------------------------- */

export const InboxDashboard = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const { searchQuery, inputValue, setInputValue, handleSearch, handleClearSearch, page, limit, handlePageChange, filters, setFilter, resetAll, hasFilters } = useSearchPagination({
    filterKeys: FILTER_KEYS,
    defaultLimit: 20,
  });

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [toDelete, setToDelete] = React.useState<ContactInquiry | null>(null);

  const { data, isLoading, isError, refetch } = contactInquiriesApi.useGetContactInquiries<ContactInquiryListResponse>({
    key: ["contact-inquiries", searchQuery, page, limit, filters.status, filters.inquiryType],
    enabled: isAuthenticated,
    params: { search: searchQuery, page, limit, status: filters.status, inquiryType: filters.inquiryType },
  });

  const deleteInquiry = contactInquiriesApi.useDeleteContactInquiry({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-inquiries"] });
      setToDelete(null);
      setSelectedId(null);
    },
  });

  const inquiries = data?.data ?? [];
  const pagination = data?.pagination;
  const counts = data?.statusCounts;

  const selected = inquiries.find((inquiry) => inquiry.id === selectedId) ?? null;

  return (
    <>
      <PageHeader
        eyebrow="Inbox"
        title="Contact Inbox"
        description="Everything sent through the contact form. This is a work queue, not an email relay — an inquiry stays here until somebody marks it handled."
      />

      {/* Status tabs count the whole inbox, not the filtered set, so the numbers mean
          the same thing whatever else is selected. */}
      {counts && (
        <div className="flex flex-wrap gap-x-1 gap-y-2 pb-4 mb-4 border-b border-border">
          <button
            type="button"
            onClick={() => setFilter("status", "")}
            className={`px-3 py-1.5 font-heading text-xxs font-semibold uppercase tracking-[0.14em] rounded-sm duration-200 cursor-pointer ${filters.status === "" ? "bg-body text-light" : "text-body/55 hover:text-body"}`}
          >
            All
          </button>
          {INQUIRY_STATUS_SEQUENCE.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilter("status", status)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 font-heading text-xxs font-semibold uppercase tracking-[0.14em] rounded-sm duration-200 cursor-pointer ${filters.status === status ? "bg-body text-light" : "text-body/55 hover:text-body"}`}
            >
              <span className={`rounded-full size-1.5 ${inquiryStatusDots[status]}`} />
              {inquiryStatusLabels[status]}
              <span className={filters.status === status ? "text-light/70" : "text-body/40"}>{counts[status]}</span>
            </button>
          ))}
        </div>
      )}

      <ListToolbar>
        <SearchBar value={inputValue} onChange={setInputValue} onSearch={handleSearch} onClear={handleClearSearch} placeholder="Search name, email or message…" />

        <ToolbarRow>
          <FilterRow>
            <FilterDropdown label="Type" value={filters.inquiryType} options={inquiryTypeOptions} onChange={(value) => setFilter("inquiryType", value)} />
            {hasFilters && (
              <AdminButton size="sm" variant="ghost" onClick={resetAll}>
                Clear
              </AdminButton>
            )}
          </FilterRow>

          {pagination && (
            <p className="text-xs text-body/50">
              {pagination.total} inquir{pagination.total === 1 ? "y" : "ies"} {hasFilters ? "matching your filters" : "total"}
            </p>
          )}
        </ToolbarRow>
      </ListToolbar>

      {selected && (
        <div className="mb-6">
          <InquiryDetail inquiry={selected} onClose={() => setSelectedId(null)} onDelete={setToDelete} />
        </div>
      )}

      {isLoading ? (
        <LoadingState message="Loading inbox" />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : inquiries.length === 0 ? (
        <EmptyState
          icon={<PiEnvelopeSimple className="size-6" />}
          title={hasFilters ? "No inquiries match your filters" : "Nothing in the inbox"}
          description={hasFilters ? "Try a different keyword, or clear the filters." : "Messages from the contact form land here."}
        />
      ) : (
        <Panel className="overflow-hidden">
          <TableShell>
            <thead className="border-b bg-muted/60 border-border">
              <tr>
                <Th>From</Th>
                <Th>Type</Th>
                <Th>Message</Th>
                <Th>Status</Th>
                <Th className="text-right">Received</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {inquiries.map((inquiry) => (
                <tr
                  key={inquiry.id}
                  onClick={() => setSelectedId(selectedId === inquiry.id ? null : inquiry.id)}
                  className={`cursor-pointer duration-200 ${selectedId === inquiry.id ? "bg-muted" : "hover:bg-muted/40"}`}
                >
                  <Td>
                    <span className="flex items-center gap-2">
                      {/* An unread mark rather than a badge: it is the one thing worth
                          spotting when scanning a full queue. */}
                      {inquiry.status === "NEW" && <span className="rounded-full size-1.5 bg-primary shrink-0" />}
                      <span className={inquiry.status === "NEW" ? "text-body" : "text-body/70"}>{inquiry.fullname}</span>
                    </span>
                    <span className="block text-xs text-body/50">{inquiry.email}</span>
                  </Td>
                  <Td className="whitespace-nowrap">{inquiryTypeLabels[inquiry.inquiryType]}</Td>
                  <Td className="max-w-md">
                    <span className="block truncate text-body/60">{inquiry.message}</span>
                  </Td>
                  <Td>
                    <Badge className={inquiryStatusColors[inquiry.status]}>{inquiryStatusLabels[inquiry.status]}</Badge>
                  </Td>
                  <Td className="text-right whitespace-nowrap text-body/50">{convertDate(inquiry.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </Panel>
      )}

      {pagination && <DataPagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} onPageChange={handlePageChange} />}

      <ConfirmDialog
        isVisible={toDelete !== null}
        title={`Delete the inquiry from ${toDelete?.fullname ?? "this sender"}?`}
        description="Deleting is for spam. Anything genuine should be archived instead — that keeps the record and the handling note."
        confirmLabel="Delete inquiry"
        isPending={deleteInquiry.isPending}
        onConfirm={() => toDelete && deleteInquiry.mutate(toDelete.id)}
        onClose={() => setToDelete(null)}
      />
    </>
  );
};
