"use client";

import * as React from "react";

import { PiTable } from "react-icons/pi";

import { convertDate, sizeGuidesApi } from "@/utils";

import { ApiResponse, SizeGuide } from "@/types";

import { AdminLinkButton, Badge, ConfirmDialog, EmptyState, ErrorState, LoadingState, PageHeader, Panel, RowAction, RowActionLink, TableShell, Td, Th } from "./slicing";

/**
 * Home of the size guide master record: list, create, edit, publish, delete.
 *
 * An earlier note here claimed authoring belonged on the product form instead. That
 * was wrong in a way worth recording: a size guide is a shared master record, so
 * requiring a product in order to create one is backwards — and it left the screen
 * called "Size Guides" unable to make a size guide. Duplicate (F-38) is the same
 * editor pre-filled from an existing guide, so there is still only one editor.
 */
export const SizeGuidesDashboard = () => {
  const [toDelete, setToDelete] = React.useState<SizeGuide | null>(null);
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const { data, isLoading, isError, refetch } = sizeGuidesApi.useGetSizeGuides<ApiResponse<SizeGuide[]>>({ key: ["size-guides"], params: { locale: "EN" } });

  const updateGuide = sizeGuidesApi.useUpdateSizeGuide({ onSuccess: () => refetch() });
  const deleteGuide = sizeGuidesApi.useDeleteSizeGuide({
    onSuccess: () => {
      refetch();
      setToDelete(null);
    },
  });

  const guides = data?.data ?? [];

  // publishedAt IS the on/off switch — there is no isActive beside it (D1).
  const togglePublished = (guide: SizeGuide) => updateGuide.mutate({ id: guide.id, guide: { publishedAt: guide.publishedAt ? null : new Date().toISOString() } });

  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Size Guides"
        description="Body measurements shared by every product that uses a guide. Published guides appear on the public Size Guide page as a flat list, listed in the order they were created; the rest are drafts, still assignable to products."
        actions={<AdminLinkButton href="/admin/dashboard/size-guides/create" variant="solid">New size guide</AdminLinkButton>}
      />

      {isLoading ? (
        <LoadingState message="Loading size guides" />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : guides.length === 0 ? (
        <EmptyState
          icon={<PiTable className="size-6" />}
          title="No size guides yet"
          description="A guide is a measurement table shared by every product that uses it."
          action={<AdminLinkButton href="/admin/dashboard/size-guides/create" variant="solid">New size guide</AdminLinkButton>}
        />
      ) : (
        <Panel className="overflow-hidden">
          <TableShell>
            <thead className="border-b bg-muted/60 border-border">
              <tr>
                <Th>Title</Th>
                <Th>Rows</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {guides.map((guide) => {
                const columns = Object.keys(guide.rows[0]?.measurements ?? {});

                return (
                  <React.Fragment key={guide.id}>
                    <tr className="duration-200 hover:bg-muted/40">
                      <Td className="text-body">{guide.title ?? "(untitled)"}</Td>
                      <Td className="tabular-nums">{guide.rows.length}</Td>
                      <Td>
                        <Badge className={guide.publishedAt ? "bg-emerald-500/15 text-emerald-700" : "bg-body/6 text-body/50"}>
                          {guide.publishedAt ? `Published ${convertDate(guide.publishedAt)}` : "Draft"}
                        </Badge>
                      </Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-4">
                          <RowAction onClick={() => setExpanded(expanded === guide.id ? null : guide.id)}>{expanded === guide.id ? "Hide" : "View"}</RowAction>
                          <RowActionLink href={`/admin/dashboard/size-guides/${guide.id}/edit`}>Edit</RowActionLink>
                          {/* F-38: the same editor, pre-filled from this guide and starting as a draft. */}
                          <RowActionLink href={`/admin/dashboard/size-guides/create?from=${guide.id}`}>Duplicate</RowActionLink>
                          <RowAction onClick={() => togglePublished(guide)} disabled={updateGuide.isPending}>
                            {guide.publishedAt ? "Unpublish" : "Publish"}
                          </RowAction>
                          <RowAction tone="danger" onClick={() => setToDelete(guide)}>
                            Delete
                          </RowAction>
                        </div>
                      </Td>
                    </tr>

                    {expanded === guide.id && (
                      <tr>
                        <Td className="bg-muted/50" colSpan={4}>
                          <div className="overflow-x-auto scrollbar">
                            <table className="w-full text-sm">
                              <thead>
                                <tr>
                                  <th className="px-3 py-2 font-heading text-xxs font-semibold tracking-[0.14em] text-left uppercase text-body/50">Size</th>
                                  {columns.map((key) => (
                                    <th key={key} className="px-3 py-2 font-heading text-xxs font-semibold tracking-[0.14em] text-left uppercase text-body/50">
                                      {/* Labels are per-locale on the translation; the key is only the fallback. */}
                                      {guide.parameterLabels?.[key] ?? key.replace(/_/g, " ")}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {guide.rows.map((row) => (
                                  <tr key={row.id}>
                                    <td className="px-3 py-2 font-mono text-xs text-body">{row.size?.code ?? row.sizeId}</td>
                                    {columns.map((key) => (
                                      <td key={key} className="px-3 py-2 text-body/70 tabular-nums">
                                        {row.measurements[key] ?? "—"}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </Td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </TableShell>
        </Panel>
      )}

      <ConfirmDialog
        isVisible={Boolean(toDelete)}
        title={`Delete "${toDelete?.title ?? "this size guide"}"?`}
        description="Refused if any product still uses it — reassign those products first, or unpublish it instead."
        confirmLabel="Delete"
        isPending={deleteGuide.isPending}
        onConfirm={() => toDelete && deleteGuide.mutate(toDelete.id)}
        onClose={() => setToDelete(null)}
      />
    </>
  );
};
