"use client";

import * as React from "react";

import { PiTable } from "react-icons/pi";

import { convertDate, sizeGuidesApi } from "@/utils";

import { ApiResponse, SizeGuide } from "@/types";

import { Badge, ConfirmDialog, EmptyState, ErrorState, LoadingState, PageHeader, Panel, RowAction, TableShell, Td, Th } from "./slicing";

/**
 * Read-and-publish screen. Creating a guide from scratch belongs on the product
 * form (F-38: pick an existing guide, tweak the measurements, save as a new one),
 * so this screen deliberately does not duplicate that editor — it lists what
 * exists, shows the measurements, and controls what the public page sees.
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
        description="Published guides appear on the public Size Guide page as a flat list, ordered by the number below. Unpublished ones are drafts. Authoring happens on the product form (F-38), so this screen lists and publishes rather than duplicating that editor."
      />

      {isLoading ? (
        <LoadingState message="Loading size guides" />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : guides.length === 0 ? (
        <EmptyState icon={<PiTable className="size-6" />} title="No size guides yet" description="Create one from a product's size guide picker." />
      ) : (
        <Panel className="overflow-hidden">
          <TableShell>
            <thead className="border-b bg-muted/60 border-border">
              <tr>
                <Th>Title</Th>
                <Th>Rows</Th>
                <Th>Order</Th>
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
                      <Td className="tabular-nums">{guide.order}</Td>
                      <Td>
                        <Badge className={guide.publishedAt ? "bg-emerald-500/15 text-emerald-700" : "bg-body/6 text-body/50"}>
                          {guide.publishedAt ? `Published ${convertDate(guide.publishedAt)}` : "Draft"}
                        </Badge>
                      </Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-4">
                          <RowAction onClick={() => setExpanded(expanded === guide.id ? null : guide.id)}>{expanded === guide.id ? "Hide" : "View"}</RowAction>
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
                        <Td className="bg-muted/50" colSpan={5}>
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
