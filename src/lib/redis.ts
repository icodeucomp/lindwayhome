// import Redis from "ioredis";

// import { createHash } from "crypto";

// export const CACHE_TTL = 8 * 60 * 60;
// export const CACHE_PREFIX_GUESTS_ALL = "guests:all";
// export const CACHE_PREFIX_PRODUCTS_ALL = "guests:all";
// export const CACHE_PREFIX_PARAMETERS = "guests:all";
// export const CACHE_PREFIX_GUEST = "guests:all";
// export const CACHE_PREFIX_PRODUCT = "guests:all";

// export const generateCacheKeyGuests = (searchParams: URLSearchParams): string => {
//   const params = {
//     page: searchParams.get("page") || "1",
//     limit: searchParams.get("limit") || "10",
//     search: searchParams.get("search"),
//     isPurchased: searchParams.get("isPurchased"),
//     year: searchParams.get("year"),
//     month: searchParams.get("month"),
//     dateFrom: searchParams.get("dateFrom"),
//     dateTo: searchParams.get("dateTo"),
//   };

//   const paramString = JSON.stringify(params);
//   const hash = createHash("md5").update(paramString).digest("hex");

//   return `${CACHE_PREFIX_GUESTS_ALL}:${hash}`;
// };

// export const generateCacheKeyProducts = (searchParams: URLSearchParams): string => {
//   const params = {
//     page: searchParams.get("page") || "1",
//     limit: searchParams.get("limit") || "10",
//     search: searchParams.get("search"),
//     category: searchParams.get("category"),
//     isActive: searchParams.get("isActive"),
//     year: searchParams.get("year"),
//     month: searchParams.get("month"),
//     dateFrom: searchParams.get("dateFrom"),
//     dateTo: searchParams.get("dateTo"),
//   };

//   const paramString = JSON.stringify(params);
//   const hash = createHash("md5").update(paramString).digest("hex");

//   return `${CACHE_PREFIX_PRODUCTS_ALL}:${hash}`;
// };

// export const redis = new Redis({
//   host: process.env.REDIS_HOST || "localhost",
//   port: parseInt(process.env.REDIS_PORT || "6379"),
//   password: process.env.REDIS_PASSWORD || undefined,
//   lazyConnect: true,
// });

// redis.on("error", (error) => {
//   console.error("Redis connection error:", error);
// });

// redis.on("connect", () => {
//   console.log("✅ Redis connected successfully");
// });
