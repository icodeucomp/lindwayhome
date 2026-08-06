"use client";

import * as React from "react";

import Link from "next/link";

import { PiArrowLeft, PiWarningCircle } from "react-icons/pi";

import { Modal } from "@/components";

/* -------------------------------------------------------------------------- */
/*                                   Buttons                                  */
/*                                                                            */
/* Deliberately not the shared `@/components` Button: that one hardcodes its   */
/* padding and weight as utilities, which win over any component-layer class   */
/* in Tailwind v4 and would fight every variant defined here.                  */
/* -------------------------------------------------------------------------- */

type ButtonVariant = "solid" | "accent" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const VARIANTS: Record<ButtonVariant, string> = {
  solid: "bg-body text-light border border-body hover:bg-body/90 disabled:bg-body/30 disabled:border-body/30",
  accent: "bg-primary text-light border border-primary hover:bg-primary/90 disabled:bg-primary/40 disabled:border-primary/40",
  outline: "bg-transparent text-body border border-border hover:border-body/40 hover:bg-body/4",
  ghost: "bg-transparent text-body/70 border border-transparent hover:text-primary",
  danger: "bg-transparent text-red-700 border border-red-700/25 hover:bg-red-700/6 hover:border-red-700/50",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xxs gap-1.5",
  md: "px-5 py-2.5 text-xs gap-2",
};

interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const AdminButton = ({ variant = "outline", size = "md", className, children, ...props }: AdminButtonProps) => (
  <button
    className={`inline-flex items-center justify-center font-heading font-semibold uppercase tracking-[0.12em] rounded-sm duration-200 cursor-pointer whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]} ${className ?? ""}`}
    {...props}
  >
    {children}
  </button>
);

/** Same look as AdminButton, but navigates. */
export const AdminLinkButton = ({ href, variant = "outline", size = "md", className, children }: { href: string; variant?: ButtonVariant; size?: ButtonSize; className?: string; children: React.ReactNode }) => (
  <Link
    href={href}
    className={`inline-flex items-center justify-center font-heading font-semibold uppercase tracking-[0.12em] rounded-sm duration-200 whitespace-nowrap ${VARIANTS[variant]} ${SIZES[size]} ${className ?? ""}`}
  >
    {children}
  </Link>
);

/* -------------------------------------------------------------------------- */
/*                                Page furniture                              */
/* -------------------------------------------------------------------------- */

export const BackLink = ({ href, label }: { href: string; label: string }) => (
  <Link href={href} className="inline-flex items-center gap-2 font-heading text-xxs font-semibold uppercase tracking-[0.16em] duration-200 text-body/60 hover:text-primary">
    <PiArrowLeft className="size-3.5" />
    {label}
  </Link>
);

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  /**
   * Constrain to the form column and centre it. Create/edit screens pass this so the
   * heading sits directly above the fields; list screens stay full width.
   */
  narrow?: boolean;
}

export const PageHeader = ({ eyebrow, title, description, actions, back, narrow }: PageHeaderProps) => (
  <div className={`mb-8 ${narrow ? "w-full max-w-3xl mx-auto" : ""}`}>
    {back ? <div className="mb-5">{<BackLink {...back} />}</div> : eyebrow ? <p className="mb-2 admin-eyebrow">{eyebrow}</p> : null}

    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="admin-title">{title}</h1>
        {description && <p className={`mt-2 text-sm text-body/60 ${narrow ? "" : "max-w-2xl"}`}>{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  </div>
);

/** Uppercase rule-under heading that opens a form section or a dashboard block. */
export const SectionHeading = ({ title, aside, className }: { title: string; aside?: React.ReactNode; className?: string }) => (
  <div className={`flex items-end justify-between gap-4 pb-3 mb-6 border-b border-border ${className ?? ""}`}>
    <h2 className="admin-section-label">{title}</h2>
    {aside && <div className="shrink-0">{aside}</div>}
  </div>
);

/** Larger heading for dashboard blocks — reads as a title, not a micro-label. */
export const BlockHeading = ({ title, aside }: { title: string; aside?: React.ReactNode }) => (
  <div className="flex items-baseline justify-between gap-4 mb-5">
    <h2 className="text-lg font-normal font-heading text-body">{title}</h2>
    {aside && <div className="text-xs shrink-0 text-body/50">{aside}</div>}
  </div>
);

export const Panel = ({ className, children }: { className?: string; children: React.ReactNode }) => <div className={`admin-panel ${className ?? ""}`}>{children}</div>;

/* -------------------------------------------------------------------------- */
/*                                    Stats                                   */
/*                                                                            */
/* Divider-separated rather than boxed: four hairlines read as one instrument  */
/* panel, where four bordered cards read as four unrelated things.             */
/* -------------------------------------------------------------------------- */

/**
 * `gap-px` over a border-coloured background draws the hairlines, so the dividers
 * stay correct at every breakpoint without per-child nth-child overrides.
 */
export const StatGrid = ({ columns = 4, children }: { columns?: 3 | 4; children: React.ReactNode }) => (
  <div className={`grid grid-cols-1 gap-px border bg-border border-border sm:grid-cols-2 ${columns === 3 ? "xl:grid-cols-3" : "xl:grid-cols-4"}`}>{children}</div>
);

export const Stat = ({ label, value, caption, footnote }: { label: string; value: React.ReactNode; caption?: string; footnote?: React.ReactNode }) => (
  <div className="px-5 py-6 bg-light">
    <p className="admin-field-label">{label}</p>
    <p className="mt-3 text-4xl font-normal font-heading text-body tabular-nums">{value}</p>
    {caption && <p className="mt-2 text-xs text-body/50">{caption}</p>}
    {footnote && <div className="mt-1 text-xs">{footnote}</div>}
  </div>
);

/* -------------------------------------------------------------------------- */
/*                                   States                                   */
/* -------------------------------------------------------------------------- */

export const Spinner = ({ className = "border-light/40 border-t-light" }: { className?: string }) => (
  <span aria-hidden className={`inline-block border-2 rounded-full shrink-0 animate-spin size-4 ${className}`} />
);

export const LoadingState = ({ message = "Loading…" }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center gap-4 py-20">
    <Spinner className="size-6 border-border border-t-primary" />
    <p className="text-xs uppercase tracking-[0.14em] font-heading text-body/50">{message}</p>
  </div>
);

export const ErrorState = ({ message = "Something went wrong while loading this data.", onRetry }: { message?: string; onRetry?: () => void }) => (
  <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
    <PiWarningCircle className="size-8 text-red-700/70" />
    <div className="space-y-1">
      <h3 className="font-heading text-body">Unable to load data</h3>
      <p className="max-w-sm text-sm text-body/60">{message}</p>
    </div>
    {onRetry && (
      <AdminButton onClick={onRetry} size="sm">
        Try again
      </AdminButton>
    )}
  </div>
);

export const EmptyState = ({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
    {icon && <span className="flex items-center justify-center rounded-full size-14 bg-muted text-body/35">{icon}</span>}
    <div className="space-y-1">
      <h3 className="font-heading text-body">{title}</h3>
      {description && <p className="max-w-sm text-sm text-body/60">{description}</p>}
    </div>
    {action}
  </div>
);

/* -------------------------------------------------------------------------- */
/*                                   Content                                  */
/* -------------------------------------------------------------------------- */

export const Badge = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 font-heading text-xxs font-semibold uppercase tracking-widest rounded-sm whitespace-nowrap ${className ?? "bg-body/6 text-body/70"}`}>
    {children}
  </span>
);

/** Bare chip used for the EN / ID / FEATURED marks under a card title. */
export const Chip = ({ muted, children }: { muted?: boolean; children: React.ReactNode }) => (
  <span className={`font-heading text-xxs font-semibold uppercase tracking-[0.14em] ${muted ? "text-body/30" : "text-primary"}`}>{children}</span>
);

export const TableShell = ({ children }: { children: React.ReactNode }) => (
  <div className="overflow-x-auto scrollbar">
    <table className="w-full min-w-max">{children}</table>
  </div>
);

export const Th = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <th className={`px-6 py-3 font-heading text-xxs font-semibold tracking-[0.14em] text-left uppercase whitespace-nowrap text-body/50 ${className ?? ""}`}>{children}</th>
);

export const Td = ({ className, colSpan, children }: { className?: string; colSpan?: number; children: React.ReactNode }) => (
  <td colSpan={colSpan} className={`px-6 py-4 text-sm align-middle text-body/80 ${className ?? ""}`}>
    {children}
  </td>
);

/** Row actions rendered as underlined uppercase links, as in the reference cards. */
export const RowAction = ({ onClick, tone = "default", disabled, children }: { onClick: () => void; tone?: "default" | "danger"; disabled?: boolean; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`font-heading text-xxs font-semibold uppercase tracking-[0.14em] duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${tone === "danger" ? "text-red-700 hover:text-red-900" : "text-body/60 hover:text-primary"}`}
  >
    {children}
  </button>
);

export const RowActionLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="font-heading text-xxs font-semibold uppercase tracking-[0.14em] duration-200 text-body/60 hover:text-primary">
    {children}
  </Link>
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
    <div className="pr-8">
      <p className="admin-eyebrow">{tone === "danger" ? "Confirm removal" : "Confirm"}</p>
      <h3 className="mt-2 text-xl font-normal font-heading text-body">{title}</h3>
      <p className="mt-2 text-sm text-body/60">{description}</p>
    </div>

    <div className="flex flex-col-reverse gap-2 pt-5 mt-6 border-t sm:flex-row sm:justify-end border-border">
      <AdminButton type="button" onClick={onClose} disabled={isPending}>
        {cancelLabel}
      </AdminButton>
      <AdminButton type="button" variant={tone === "danger" ? "danger" : "solid"} onClick={onConfirm} disabled={isPending}>
        {isPending && <Spinner className={tone === "danger" ? "border-red-700/30 border-t-red-700" : "border-light/40 border-t-light"} />}
        {isPending ? "Working…" : confirmLabel}
      </AdminButton>
    </div>
  </Modal>
);
