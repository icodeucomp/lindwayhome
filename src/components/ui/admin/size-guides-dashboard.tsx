"use client";

import * as React from "react";


import { convertDate, sizeGuidesApi } from "@/utils";

import { ApiResponse, SizeGuide } from "@/types";

import { Badge, ConfirmDialog, EmptyState, ErrorState, LoadingState, Panel, TableShell, Td, Th } from "./slicing";

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

  const togglePublished = (guide: SizeGuide) => {
    // publishedAt IS the on/off switch — there is no isActive beside it (D1).
    updateGuide.mutate({ id: guide.id, guide: { publishedAt: guide.publishedAt ? null : new Date().toISOString() } });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold font-heading text-body">Size Guides</h1>
        <p className="mt-1 text-sm text-body/70">Published guides appear on the public Size Guide page as a flat list, ordered by the number below. Unpublished ones are drafts.</p>
      </div>

      {isLoading ? (
        <LoadingState message="Loading size guides…" />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : guides.length === 0 ? (
        <EmptyState icon={<span className="text-2xl">📐</span>} title="No size guides yet" description="Create one from a product's size guide picker." />
      ) : (
        <Panel>
          <TableShell>
            <thead>
              <tr>
                <Th>Title</Th>
                <Th>Rows</Th>
                <Th>Order</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {guides.map((guide) => (
                <React.Fragment key={guide.id}>
                  <tr>
                    <Td className="font-medium">{guide.title ?? "(untitled)"}</Td>
                    <Td>{guide.rows.length}</Td>
                    <Td>{guide.order}</Td>
                    <Td>
                      <Badge className={guide.publishedAt ? "bg-primary/10 text-primary" : "bg-body/10 text-body/60"}>
                        {guide.publishedAt ? `Published ${convertDate(guide.publishedAt)}` : "Draft"}
                      </Badge>
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setExpanded(expanded === guide.id ? null : guide.id)} className="text-sm underline text-primary">
                          {expanded === guide.id ? "Hide" : "View"}
                        </button>
                        <button onClick={() => togglePublished(guide)} disabled={updateGuide.isPending} className="text-sm underline text-primary disabled:opacity-50">
                          {guide.publishedAt ? "Unpublish" : "Publish"}
                        </button>
                        <button onClick={() => setToDelete(guide)} className="text-sm underline text-red-600">
                          Delete
                        </button>
                      </div>
                    </Td>
                  </tr>

                  {expanded === guide.id && (
                    <tr>
                      <Td className="bg-muted/50" colSpan={5}>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-body/60">
                                <th className="px-3 py-2">Size</th>
                                {Object.keys(guide.rows[0]?.measurements ?? {}).map((key) => (
                                  <th key={key} className="px-3 py-2">
                                    {guide.parameterLabels?.[key] ?? key}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {guide.rows.map((row) => (
                                <tr key={row.id}>
                                  <td className="px-3 py-2 font-mono">{row.size?.code ?? row.sizeId}</td>
                                  {Object.keys(guide.rows[0]?.measurements ?? {}).map((key) => (
                                    <td key={key} className="px-3 py-2">
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
              ))}
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

      <Panel className="p-4">
        <p className="text-sm text-body/70">
          <strong>Creating a guide</strong> happens on the product form: pick an existing guide, adjust the measurements, and save it as a new one (F-38). That screen arrives in phase 2.
        </p>
      </Panel>
    </div>
  );
};
