import Image from "next/image";

import { shimmer, toBase64 } from "@/utils";

import { BackgroundProps } from "@/types";

export const Background = ({ src, alt, children, className, parentClassName, imgClassName }: BackgroundProps) => {
  return (
    <figure className={`relative text-light shadow-lg overflow-hidden ${parentClassName ?? ""}`}>
      <Image
        src={src}
        alt={alt}
        placeholder={`data:image/svg+xml;base64,${toBase64(shimmer(400, 400))}`}
        fill
        quality={100}
        priority
        className={`absolute inset-0 w-full h-full object-cover ${imgClassName}`}
      />
      <div className={`z-5 relative w-full ${className ?? ""}`}>{children}</div>
    </figure>
  );
};
