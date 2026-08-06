"use client";

import * as React from "react";

import { PiRuler } from "react-icons/pi";

import { sizesApi } from "@/utils";

import { ApiResponse, CreateSize, Size } from "@/types";

import { AdminButton, Badge, ConfirmDialog, EmptyState, ErrorState, Field, LoadingState, PageHeader, Panel, RowAction, TableShell, Td, Th, TextInput } from "./slicing";

const EMPTY: CreateSize = { code: "", label: "", order: 0, isActive: true };

export const SizesDashboard = () => {
  const [form, setForm] = React.useState<CreateSize>(EMPTY);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [toDelete, setToDelete] = React.useState<Size | null>(null);

  const { data, isLoading, isError, refetch } = sizesApi.useGetSizes<ApiResponse<Size[]>>({ key: ["sizes"] });

  const onSettled = () => {
    refetch();
    setForm(EMPTY);
    setEditingId(null);
  };

  const createSize = sizesApi.useCreateSize({ onSuccess: onSettled });
  const updateSize = sizesApi.useUpdateSize({ onSuccess: onSettled });
  const deleteSize = sizesApi.useDeleteSize({
    onSuccess: () => {
      refetch();
      setToDelete(null);
    },
  });

  const sizes = data?.data ?? [];
  const isPending = createSize.isPending || updateSize.isPending;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.code.trim() || !form.label.trim()) return;

    if (editingId) updateSize.mutate({ id: editingId, size: form });
    else createSize.mutate(form);
  };

  const startEdit = (size: Size) => {
    setEditingId(size.id);
    setForm({ code: size.code, label: size.label, order: size.order, isActive: size.isActive });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY);
  };

  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Sizes"
        description="The master list every product variant and size guide row points at. A size code must match a package_dimensions key exactly, or checkout returns 404 for it."
      />

      <Panel className="p-5 mb-8 sm:p-6">
        <p className="mb-5 admin-section-label">{editingId ? "Edit size" : "Add a size"}</p>

        <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Code" htmlFor="code" required hint="XS, S, 2Y — uppercase">
            <TextInput id="code" value={form.code} onChange={(event) => setForm((previous) => ({ ...previous, code: event.target.value.toUpperCase() }))} placeholder="XS" required />
          </Field>

          <Field label="Label" htmlFor="label" required>
            <TextInput id="label" value={form.label} onChange={(event) => setForm((previous) => ({ ...previous, label: event.target.value }))} placeholder="Extra Small" required />
          </Field>

          <Field label="Order" htmlFor="order" hint="Sorts pickers and guide rows">
            <TextInput id="order" type="number" value={form.order ?? 0} onChange={(event) => setForm((previous) => ({ ...previous, order: Number(event.target.value) }))} />
          </Field>

          <div className="flex items-start gap-2 sm:pt-6">
            <AdminButton type="submit" variant="solid" disabled={isPending}>
              {isPending ? "Saving…" : editingId ? "Update" : "Add size"}
            </AdminButton>
            {editingId && (
              <AdminButton type="button" onClick={cancelEdit}>
                Cancel
              </AdminButton>
            )}
          </div>
        </form>
      </Panel>

      {isLoading ? (
        <LoadingState message="Loading sizes" />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : sizes.length === 0 ? (
        <EmptyState icon={<PiRuler className="size-6" />} title="No sizes yet" description="Add the sizes your products come in." />
      ) : (
        <Panel className="overflow-hidden">
          <TableShell>
            <thead className="border-b bg-muted/60 border-border">
              <tr>
                <Th>Code</Th>
                <Th>Label</Th>
                <Th>Order</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {sizes.map((size) => (
                <tr key={size.id} className="duration-200 hover:bg-muted/40">
                  <Td className="font-mono text-body">{size.code}</Td>
                  <Td>{size.label}</Td>
                  <Td className="tabular-nums">{size.order}</Td>
                  <Td>
                    <Badge className={size.isActive ? "bg-primary/12 text-primary" : "bg-body/6 text-body/50"}>{size.isActive ? "Active" : "Inactive"}</Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-4">
                      <RowAction onClick={() => startEdit(size)}>Edit</RowAction>
                      <RowAction tone="danger" onClick={() => setToDelete(size)}>
                        Delete
                      </RowAction>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </Panel>
      )}

      <ConfirmDialog
        isVisible={Boolean(toDelete)}
        title={`Delete size "${toDelete?.code}"?`}
        description="If any product variant or size guide row uses it, it will be deactivated instead of deleted so existing data stays intact."
        confirmLabel="Delete"
        isPending={deleteSize.isPending}
        onConfirm={() => toDelete && deleteSize.mutate(toDelete.id)}
        onClose={() => setToDelete(null)}
      />
    </>
  );
};
