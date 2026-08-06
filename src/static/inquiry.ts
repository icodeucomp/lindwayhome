import { InquiryStatus, InquiryType } from "@/types";

/**
 * Display maps for the contact inbox (F-45, F-47). Every screen that shows an
 * inquiry reads from here, so the wording and the colour stay the same in the
 * list, the detail panel and the status filter.
 */

export const inquiryTypeLabels: Record<InquiryType, string> = {
  PRODUCT_INQUIRY: "Product Inquiry",
  ORDER_SUPPORT: "Order Support",
  CUSTOM_ORDER: "Custom Order",
  WHOLESALE_B2B: "Wholesale / B2B",
  PARTNERSHIP: "Partnership",
  OTHER: "Other",
};

export const inquiryStatusLabels: Record<InquiryStatus, string> = {
  NEW: "New",
  IN_PROGRESS: "In Progress",
  HANDLED: "Handled",
  ARCHIVED: "Archived",
};

export const inquiryStatusColors: Record<InquiryStatus, string> = {
  NEW: "bg-primary/15 text-primary",
  IN_PROGRESS: "bg-amber-500/15 text-amber-700",
  HANDLED: "bg-emerald-500/15 text-emerald-700",
  ARCHIVED: "bg-body/6 text-body/50",
};

export const inquiryStatusDots: Record<InquiryStatus, string> = {
  NEW: "bg-primary",
  IN_PROGRESS: "bg-amber-500",
  HANDLED: "bg-emerald-600",
  ARCHIVED: "bg-body/30",
};

/** Workflow order, not alphabetical — the inbox renders it as a queue. */
export const INQUIRY_STATUS_SEQUENCE: InquiryStatus[] = [InquiryStatus.NEW, InquiryStatus.IN_PROGRESS, InquiryStatus.HANDLED, InquiryStatus.ARCHIVED];

/**
 * What an admin can move an inquiry to from where it is. Archiving is always
 * available — some inquiries are spam and never need working through — but nothing
 * moves backwards out of HANDLED except to archive, so a closed inquiry cannot be
 * quietly reopened without a trace.
 */
export const nextStatuses: Record<InquiryStatus, InquiryStatus[]> = {
  NEW: [InquiryStatus.IN_PROGRESS, InquiryStatus.HANDLED, InquiryStatus.ARCHIVED],
  IN_PROGRESS: [InquiryStatus.HANDLED, InquiryStatus.ARCHIVED],
  HANDLED: [InquiryStatus.ARCHIVED],
  ARCHIVED: [InquiryStatus.IN_PROGRESS],
};

export const inquiryStatusOptions = [{ value: "", label: "All" }, ...INQUIRY_STATUS_SEQUENCE.map((status) => ({ value: status, label: inquiryStatusLabels[status] }))];

export const inquiryTypeOptions = [{ value: "", label: "All" }, ...Object.entries(inquiryTypeLabels).map(([value, label]) => ({ value, label }))];
