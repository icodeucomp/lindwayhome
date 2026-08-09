/**
 * Stand-in artwork for every photograph on the site.
 *
 * The client's photography is not in yet, so rather than shipping placeholders under
 * a dozen different filenames — each of which would have to be hunted down and swapped
 * later — every image points at this one constant. Replacing the real photos is then a
 * matter of putting the files back into `public/images/` and reverting the commit that
 * introduced this, rather than a search through 34 files.
 *
 * Logos and icons are deliberately NOT covered: they are brand assets that already
 * exist, and blanking them would make the site unrecognisable rather than unfinished.
 *
 * Serving this through `next/image` needs two things in `next.config.ts`, both already
 * added: `placehold.net` in `remotePatterns`, and `dangerouslyAllowSVG` — SVG can carry
 * script, so it is paired there with a CSP that forbids exactly that. Both should come
 * back out with this constant.
 */
export const PLACEHOLDER_IMAGE = "https://placehold.net/default.svg";
