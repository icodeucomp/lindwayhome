export interface PaginationProps {
  setPage: (page: number) => void;
  page: number;
  totalPage: number;
  isNumber?: boolean;
}
