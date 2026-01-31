import Image from "next/image";

import { ImageProps } from "@/types";
import { shimmer, toBase64 } from "@/utils";

export const Img = ({ src, alt, className, cover, width = 0, height = 0, position = "center" }: ImageProps) => {
  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      <Image
        src={src}
        alt={alt}
        width={width === 0 ? undefined : width}
        height={height === 0 ? undefined : height}
        fill={width === 0 && height === 0}
        objectFit={cover ? "cover" : ""}
        objectPosition={position}
        placeholder={`data:image/svg+xml;base64,${toBase64(shimmer(500, 500))}`}
        className="w-full h-full"
      />
    </div>
  );
};
