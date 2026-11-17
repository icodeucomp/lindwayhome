import Image from "next/image";

import { ImageProps } from "@/types";
import { shimmer, toBase64 } from "@/utils";

// An uploaded file's stored `url` carries the domain it was uploaded on (beta.lindwayhome.com,
// localhost…). Both sites share one database and one uploads volume, so that domain is often not the
// one rendering the page, and next/image refuses hosts missing from `remotePatterns` (400). Our own
// uploads are therefore always requested as a path on the current site, which the optimizer reads internally.
const OWN_UPLOAD = /^https?:\/\/(?:[\w-]+\.)*(?:lindwayhome\.com|localhost)(?::\d+)?(\/uploads\/.+)$/i;
const localUploadPath = (src: string) => OWN_UPLOAD.exec(src)?.[1] ?? src;

export const Img = ({ src, alt, className, cover, width = 0, height = 0, position = "center" }: ImageProps) => {
  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      <Image
        src={localUploadPath(src)}
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
