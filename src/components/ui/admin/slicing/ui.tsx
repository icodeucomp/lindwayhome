"use client";

import * as React from "react";

import { FaExclamationTriangle, FaSearch, FaTimes } from "react-icons/fa";

import { Button, Modal } from "@/components";

/* -------------------------------------------------------------------------- */
/*                                  Surfaces                                  */
/* -------------------------------------------------------------------------- */

export const Panel = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={`border rounded-lg shadow-sm border-gray/15 bg-light ${className ?? ""}`}>{children}</div>
);

export const Spinner = ({ className = "border-light/40 border-t-light" }: { className?: string }) => (
  <span aria-hidden className={`inline-block border-2 rounded-full shrink-0 animate-spin size-4 ${className}`} />
);

/* -------------------------------------------------------------------------- */
/*                                   States                                   */
/* -------------------------------------------------------------------------- */

export const LoadingState = ({ message = "Loading data..." }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center gap-4 py-16">
    <span className="loader" />
    <p className="text-sm text-gray/70">{message}</p>
  </div>
);

export const ErrorState = ({ message = "Something went wrong while loading this data.", onRetry }: { message?: string; onRetry?: () => void }) => (
  <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
    <span className="flex items-center justify-center text-red-600 rounded-full size-12 bg-red-50">
      <FaExclamationTriangle className="size-5" />
    </span>
    <div className="space-y-1">
      <h3 className="font-semibold text-darker-gray">Unable to load data</h3>
      <p className="max-w-sm text-sm text-gray/70">{message}</p>
    </div>
    {onRetry && (
      <Button onClick={onRetry} className="btn-outline">
        Try again
      </Button>
    )}
  </div>
);

export const EmptyState = ({ icon, title, description, action }: { icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
    <span className="flex items-center justify-center rounded-full size-14 bg-gray/10 text-gray/50">{icon}</span>
    <div className="space-y-1">
      <h3 className="font-semibold text-darker-gray">{title}</h3>
      {description && <p className="max-w-sm text-sm text-gray/70">{description}</p>}
    </div>
    {action}
  </div>
);

/* -------------------------------------------------------------------------- */
/*                                   Toolbar                                  */
/* -------------------------------------------------------------------------- */

export const Toolbar = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <Panel className={`flex flex-col gap-3 p-4 mb-6 lg:flex-row lg:items-center ${className ?? ""}`}>{children}</Panel>
);

interface SearchInputProps {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  onClear?: () => void;
}

export const SearchInput = ({ value, placeholder = "Search...", onChange, onSearch, onClear }: SearchInputProps) => (
  <div className="relative flex-1">
    <FaSearch className="absolute -translate-y-1/2 pointer-events-none size-4 left-3 top-1/2 text-gray/40" />
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      aria-label={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSearch();
      }}
      className="pl-10 pr-10 input-form"
    />
    {value && onClear && (
      <button type="button" onClick={onClear} aria-label="Clear search" className="absolute -translate-y-1/2 cursor-pointer right-3 top-1/2 text-gray/40 hover:text-gray">
        <FaTimes className="size-3.5" />
      </button>
    )}
  </div>
);

interface FilterSelectProps {
  value: string;
  label: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

export const FilterSelect = ({ value, label, options, onChange }: FilterSelectProps) => (
  <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="w-full cursor-pointer input-form lg:w-auto">
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

/* -------------------------------------------------------------------------- */
/*                                   Content                                  */
/* -------------------------------------------------------------------------- */

export const Badge = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${className ?? ""}`}>{children}</span>
);

export const TableShell = ({ children }: { children: React.ReactNode }) => (
  <div className="overflow-x-auto scrollbar">
    <table className="w-full min-w-max">{children}</table>
  </div>
);

export const Th = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <th className={`px-6 py-3.5 text-xs font-semibold tracking-wider text-left uppercase whitespace-nowrap text-gray/70 ${className ?? ""}`}>{children}</th>
);

export const Td = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <td className={`px-6 py-4 text-sm align-middle text-gray ${className ?? ""}`}>{children}</td>
);

/* -------------------------------------------------------------------------- */
/*                                    Forms                                   */
/* -------------------------------------------------------------------------- */

interface FieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

export const Field = ({ label, htmlFor, required, error, hint, className, children }: FieldProps) => (
  <div className={`space-y-1.5 ${className ?? ""}`}>
    <label htmlFor={htmlFor} className="block text-sm font-medium text-darker-gray">
      {label} {required && <span className="text-secondary">*</span>}
    </label>
    {children}
    {error ? <p className="text-xs text-red-600">{error}</p> : hint ? <p className="text-xs text-gray/60">{hint}</p> : null}
  </div>
);

export const FormSection = ({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) => (
  <section className="space-y-4">
    <div className="pb-3 border-b border-gray/10">
      <h3 className="text-sm font-semibold tracking-wide uppercase text-darker-gray">{title}</h3>
      {description && <p className="mt-0.5 text-xs text-gray/70">{description}</p>}
    </div>
    {children}
  </section>
);

export const Checkbox = ({ id, name, label, description, checked, onChange }: { id: string; name: string; label: string; description?: string; checked?: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
  <label
    htmlFor={id}
    className={`flex items-start gap-3 p-3 duration-300 border rounded-lg cursor-pointer ${checked ? "border-gray/40 bg-gray/5" : "border-gray/20 hover:bg-gray/5"}`}
  >
    <input id={id} name={name} type="checkbox" checked={!!checked} onChange={onChange} className="mt-0.5 rounded cursor-pointer accent-gray size-4" />
    <span>
      <span className="block text-sm font-medium text-darker-gray">{label}</span>
      {description && <span className="block text-xs text-gray/70">{description}</span>}
    </span>
  </label>
);

/* -------------------------------------------------------------------------- */
/*                                   Dialogs                                  */
/* -------------------------------------------------------------------------- */

interface ConfirmDialogProps {
  isVisible: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isPending?: boolean;
  tone?: "danger" | "primary";
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDialog = ({ isVisible, title, description, confirmLabel = "Confirm", cancelLabel = "Cancel", isPending, tone = "danger", onConfirm, onClose }: ConfirmDialogProps) => (
  <Modal isVisible={isVisible} onClose={onClose} isSmall>
    <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
      <span className={`flex items-center justify-center rounded-full shrink-0 size-12 ${tone === "danger" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>
        <FaExclamationTriangle className="size-5" />
      </span>
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-darker-gray">{title}</h3>
        <p className="text-sm text-gray">{description}</p>
      </div>
    </div>

    <div className="flex flex-col-reverse gap-3 mt-6 sm:flex-row sm:justify-end">
      <Button type="button" onClick={onClose} disabled={isPending} className="btn-outline">
        {cancelLabel}
      </Button>
      <Button type="button" onClick={onConfirm} disabled={isPending} className={`flex items-center justify-center gap-2 ${tone === "danger" ? "btn-red" : "btn-blue"}`}>
        {isPending && <Spinner />}
        {isPending ? "Processing..." : confirmLabel}
      </Button>
    </div>
  </Modal>
);
