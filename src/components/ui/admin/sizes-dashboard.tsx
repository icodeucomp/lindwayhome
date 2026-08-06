"use client";

import * as React from "react";

import { Button } from "@/components";

import { sizesApi } from "@/utils";

import { ApiResponse, CreateSize, Size } from "@/types";

import { Badge, ConfirmDialog, EmptyState, ErrorState, Field, LoadingState, Panel, TableShell, Td, Th } from "./slicing";

const emptyForm: CreateSize = { code: "", label: "", order: 0, isActive: true };

export const SizesDashboard = () => {
  const [form, setForm] = React.useState<CreateSize>(emptyForm);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [toDelete, setToDelete] = React.useState<Size | null>(null);

  const { data, isLoading, isError, refetch } = sizesApi.useGetSizes<ApiResponse<Size[]>>({ key: ["sizes"] });

  const onSettled = () => {
    refetch();
    setForm(emptyForm);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold font-heading text-body">Sizes</h1>
        <p className="mt-1 text-sm text-body/70">
          The master list every product variant and size guide row points at. A size <strong>code</strong> must match a <code>package_dimensions</code> key exactly, or checkout returns 404 for
          it.
        </p>
      </div>

      <Panel className="p-5">
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-4">
          <Field label="Code" htmlFor="code" required hint="XS, S, 2Y — uppercase">
            <input
              id="code"
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
              className="input-form"
              placeholder="XS"
              required
            />
          </Field>

          <Field label="Label" htmlFor="label" required>
            <input id="label" value={form.label} onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))} className="input-form" placeholder="Extra Small" required />
          </Field>

          <Field label="Order" htmlFor="order" hint="Sorts pickers and guide rows">
            <input id="order" type="number" value={form.order ?? 0} onChange={(event) => setForm((prev) => ({ ...prev, order: Number(event.target.value) }))} className="input-form" />
          </Field>

          <div className="flex items-end gap-2">
            <Button type="submit" disabled={isPending} className="btn-blue">
              {isPending ? "Saving…" : editingId ? "Update" : "Add size"}
            </Button>
            {editingId && (
              <Button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
                className="btn-outline"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Panel>

      {isLoading ? (
        <LoadingState message="Loading sizes…" />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : sizes.length === 0 ? (
        <EmptyState icon={<span className="text-2xl">📏</span>} title="No sizes yet" description="Add the sizes your products come in." />
      ) : (
        <Panel>
          <TableShell>
            <thead>
              <tr>
                <Th>Code</Th>
                <Th>Label</Th>
                <Th>Order</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {sizes.map((size) => (
                <tr key={size.id}>
                  <Td className="font-mono font-medium">{size.code}</Td>
                  <Td>{size.label}</Td>
                  <Td>{size.order}</Td>
                  <Td>
                    <Badge className={size.isActive ? "bg-primary/10 text-primary" : "bg-body/10 text-body/60"}>{size.isActive ? "Active" : "Inactive"}</Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(size)} className="text-sm underline text-primary">
                        Edit
                      </button>
                      <button onClick={() => setToDelete(size)} className="text-sm underline text-red-600">
                        Delete
                      </button>
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
    </div>
  );
};
