/**
 * The `year` / `month` / `dateFrom` / `dateTo` filter shared by every list endpoint
 * (§E3). It was copy-pasted into four routes in v1; a single implementation means
 * one place to fix when a boundary turns out to be off by a day.
 */
export interface DateRangeQuery {
  year?: string;
  month?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface DateFilter {
  gte?: Date;
  lte?: Date;
}

export const buildDateFilter = ({ year, month, dateFrom, dateTo }: DateRangeQuery): DateFilter | undefined => {
  const filter: DateFilter = {};

  if (year && month) {
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    if (yearNum && monthNum >= 1 && monthNum <= 12) {
      filter.gte = new Date(yearNum, monthNum - 1, 1);
      filter.lte = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
    }
  } else if (year) {
    const yearNum = parseInt(year);
    if (yearNum) {
      filter.gte = new Date(yearNum, 0, 1);
      filter.lte = new Date(yearNum, 11, 31, 23, 59, 59, 999);
    }
  } else if (month) {
    const monthNum = parseInt(month);
    if (monthNum >= 1 && monthNum <= 12) {
      const currentYear = new Date().getFullYear();
      filter.gte = new Date(currentYear, monthNum - 1, 1);
      filter.lte = new Date(currentYear, monthNum, 0, 23, 59, 59, 999);
    }
  }

  // Explicit bounds win over the year/month shorthand.
  if (dateFrom) {
    const from = new Date(dateFrom);
    if (!isNaN(from.getTime())) filter.gte = from;
  }

  if (dateTo) {
    const to = new Date(dateTo);
    if (!isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999);
      filter.lte = to;
    }
  }

  return Object.keys(filter).length > 0 ? filter : undefined;
};

/** Prisma rejects `null` for an optional FK in unchecked creates; it wants `undefined`. */
export const nullToUndefined = <T>(value: T | null | undefined): T | undefined => value ?? undefined;
