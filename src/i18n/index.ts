// Client-safe exports only. `get-dictionary` is server-side and must be imported
// from "@/i18n/get-dictionary" directly — re-exporting it here would drag both
// dictionaries into every client bundle that touches a locale helper.
export * from "./config";
