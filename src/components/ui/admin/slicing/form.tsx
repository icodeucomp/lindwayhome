"use client";

import * as React from "react";

import { PiCaretDown, PiCheck } from "react-icons/pi";

import { TiptapEditor } from "@/components";

import type { JSONContent } from "@tiptap/react";

import { AdminButton, SectionHeading, Spinner } from "./ui";

/* -------------------------------------------------------------------------- */
/*                                   Layout                                   */
/* -------------------------------------------------------------------------- */

/** Centred single-column form body, matching the create/edit screens. */
export const FormLayout = ({ children, onSubmit }: { children: React.ReactNode; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) => (
  <form onSubmit={onSubmit} noValidate className="max-w-3xl pb-24 space-y-12">
    {children}
  </form>
);

export const FormSection = ({ title, description, aside, children }: { title: string; description?: string; aside?: React.ReactNode; children: React.ReactNode }) => (
  <section>
    <SectionHeading title={title} aside={aside} className={description ? "mb-3" : undefined} />
    {description && <p className="mb-6 text-sm text-body/60">{description}</p>}
    <div className="space-y-6">{children}</div>
  </section>
);

/** Two fields side by side on desktop, stacked on mobile. */
export const FieldRow = ({ children }: { children: React.ReactNode }) => <div className="grid gap-6 sm:grid-cols-2">{children}</div>;

/**
 * Action bar pinned to the bottom of the viewport. A long form otherwise makes the
 * admin scroll to the end to discover whether their edits can even be saved.
 */
export const FormActions = ({ isPending, submitLabel, onCancel, cancelLabel = "Cancel", note }: { isPending?: boolean; submitLabel: string; onCancel: () => void; cancelLabel?: string; note?: string }) => (
  <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-light/95 backdrop-blur border-border lg:pl-64">
    <div className="flex items-center justify-between gap-4 px-4 py-3 mx-auto max-w-7xl sm:px-6 lg:px-8">
      <p className="hidden text-xs sm:block text-body/50">{note}</p>
      <div className="flex items-center justify-end flex-1 gap-2">
        <AdminButton type="button" onClick={onCancel} disabled={isPending}>
          {cancelLabel}
        </AdminButton>
        <AdminButton type="submit" variant="solid" disabled={isPending}>
          {isPending && <Spinner />}
          {isPending ? "Saving…" : submitLabel}
        </AdminButton>
      </div>
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/*                                    Field                                   */
/* -------------------------------------------------------------------------- */

interface FieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  /** Right-aligned control on the label row — the reference's "+ NEW" affordance. */
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export const Field = ({ label, htmlFor, required, error, hint, action, className, children }: FieldProps) => (
  <div className={className}>
    <div className="flex items-center justify-between gap-3 mb-2">
      <label htmlFor={htmlFor} className="admin-field-label">
        {label} {required && <span className="text-primary">*</span>}
      </label>
      {action}
    </div>
    {children}
    {error ? <p className="mt-1.5 text-xs text-red-700">{error}</p> : hint ? <p className="mt-1.5 text-xs text-body/50">{hint}</p> : null}
  </div>
);

/** Small uppercase link used as a Field `action`. */
export const FieldAction = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <button type="button" onClick={onClick} className="font-heading text-xxs font-semibold uppercase tracking-[0.14em] duration-200 cursor-pointer text-primary hover:text-body">
    {children}
  </button>
);

/* -------------------------------------------------------------------------- */
/*                                  Controls                                  */
/* -------------------------------------------------------------------------- */

export const TextInput = ({ invalid, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) => (
  <input {...props} className={`input-form ${invalid ? "border-red-700 focus:border-red-700 focus:ring-red-700" : ""} ${className ?? ""}`} />
);

export const TextArea = ({ invalid, rows = 5, className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) => (
  <textarea {...props} rows={rows} className={`input-form resize-y ${invalid ? "border-red-700 focus:border-red-700 focus:ring-red-700" : ""} ${className ?? ""}`} />
);

interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
  invalid?: boolean;
}

export const SelectInput = ({ options, placeholder, invalid, className, ...props }: SelectInputProps) => (
  <div className="relative">
    <select {...props} className={`select-form ${invalid ? "border-red-700 focus:border-red-700 focus:ring-red-700" : ""} ${className ?? ""}`}>
      {placeholder && (
        <option value="" disabled={props.required}>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
    <PiCaretDown aria-hidden className="absolute -translate-y-1/2 pointer-events-none size-4 right-3.5 top-1/2 text-body/40" />
  </div>
);

export const CheckboxItem = ({ id, label, description, checked, disabled, onChange }: { id: string; label: string; description?: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) => (
  <label htmlFor={id} className={`flex items-start gap-2.5 ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer group"}`}>
    <input id={id} type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 checkbox-form" />
    <span className="min-w-0">
      <span className={`block text-sm duration-200 ${checked ? "text-body" : "text-body/70"} ${disabled ? "" : "group-hover:text-body"}`}>{label}</span>
      {description && <span className="block text-xs text-body/45">{description}</span>}
    </span>
  </label>
);

/** Two-column checklist, as in the reference's SERVICES block. */
export const CheckboxGroup = <T extends string>({ name, options, value, onChange }: { name: string; options: { value: T; label: string; description?: string }[]; value: T[]; onChange: (next: T[]) => void }) => (
  <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
    {options.map((option) => (
      <CheckboxItem
        key={option.value}
        id={`${name}-${option.value}`}
        label={option.label}
        description={option.description}
        checked={value.includes(option.value)}
        onChange={(checked) => onChange(checked ? [...value, option.value] : value.filter((item) => item !== option.value))}
      />
    ))}
  </div>
);

export const RadioGroup = <T extends string>({ name, options, value, onChange }: { name: string; options: { value: T; label: string; description?: string }[]; value: T | ""; onChange: (next: T) => void }) => (
  <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
    {options.map((option) => (
      <label key={option.value} htmlFor={`${name}-${option.value}`} className="flex items-start gap-2.5 cursor-pointer group">
        <input
          id={`${name}-${option.value}`}
          type="radio"
          name={name}
          value={option.value}
          checked={value === option.value}
          onChange={() => onChange(option.value)}
          className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
        />
        <span className="min-w-0">
          <span className={`block text-sm duration-200 group-hover:text-body ${value === option.value ? "text-body" : "text-body/70"}`}>{option.label}</span>
          {option.description && <span className="block text-xs text-body/45">{option.description}</span>}
        </span>
      </label>
    ))}
  </div>
);

/** Standalone boolean, for flags like Active / Featured / Pre-order. */
export const Toggle = ({ id, label, description, checked, onChange }: { id: string; label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void }) => (
  <label htmlFor={id} className="flex items-start justify-between gap-4 py-3 border-b cursor-pointer border-border/60 last:border-b-0">
    <span className="min-w-0">
      <span className="block text-sm text-body">{label}</span>
      {description && <span className="block mt-0.5 text-xs text-body/50">{description}</span>}
    </span>
    <span className="relative shrink-0">
      <input id={id} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="sr-only peer" />
      <span className="block w-10 h-6 duration-200 border rounded-full border-border bg-muted peer-checked:bg-primary peer-checked:border-primary" />
      <span className="absolute top-1 left-1 block duration-200 rounded-full size-4 bg-light shadow-sm peer-checked:translate-x-4 border border-border peer-checked:border-primary" />
    </span>
  </label>
);

/* -------------------------------------------------------------------------- */
/*                                  Rich text                                 */
/* -------------------------------------------------------------------------- */

export const RichTextField = ({ label, required, hint, error, action, value, onChange, placeholder, disabled }: Omit<FieldProps, "children" | "htmlFor"> & { value?: JSONContent | null; onChange: (value: JSONContent | null) => void; placeholder?: string; disabled?: boolean }) => (
  <Field label={label} required={required} hint={hint} error={error} action={action}>
    <TiptapEditor value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} />
  </Field>
);

/* -------------------------------------------------------------------------- */
/*                                Locale switch                               */
/*                                                                            */
/* Admin forms translate behind a tab rather than side by side (§B3.3): the    */
/* product form would otherwise carry five rich-text editors twice over on one */
/* screen. EN is required, ID optional (D3), so the ID tab is marked when it   */
/* has no content yet.                                                        */
/* -------------------------------------------------------------------------- */

export const LocaleTabs = <T extends string>({ locales, active, onChange, filled }: { locales: readonly T[]; active: T; onChange: (locale: T) => void; filled?: Partial<Record<T, boolean>> }) => (
  <div className="inline-flex p-0.5 border rounded-sm border-border bg-muted">
    {locales.map((locale) => (
      <button
        key={locale}
        type="button"
        onClick={() => onChange(locale)}
        aria-pressed={active === locale}
        className={`inline-flex items-center gap-1.5 px-4 py-1.5 font-heading text-xxs font-semibold uppercase tracking-[0.14em] rounded-sm duration-200 cursor-pointer ${active === locale ? "bg-body text-light" : "text-body/55 hover:text-body"}`}
      >
        {locale}
        {filled?.[locale] && <PiCheck className={`size-3 ${active === locale ? "text-light/70" : "text-primary"}`} />}
      </button>
    ))}
  </div>
);
