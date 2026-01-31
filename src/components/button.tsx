import { ButtonProps } from "@/types";

export const Button = ({ children, className, ...props }: ButtonProps) => {
  return (
    <button className={`px-2.5 text-sm py-2 md:px-4 font-medium duration-300 ${className ?? ""}`} {...props}>
      {children}
    </button>
  );
};
