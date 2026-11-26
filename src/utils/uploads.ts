// An uploaded file's stored `url` carries the domain it was uploaded on (beta.lindwayhome.com,
// localhost…). Both sites share one database and one uploads volume, so that domain is often not the
// one rendering the page, and next/image refuses hosts missing from `remotePatterns` (400). Our own
// uploads are therefore always requested as a path on the current site.
const OWN_UPLOAD = /^https?:\/\/(?:[\w-]+\.)*(?:lindwayhome\.com|localhost)(?::\d+)?(\/uploads\/.+)$/i;

export const localUploadPath = (src: string): string => OWN_UPLOAD.exec(src)?.[1] ?? src;
