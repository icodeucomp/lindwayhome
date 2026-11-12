import { createHash, createHmac, timingSafeEqual } from "crypto";

import { hashPassword, prisma, verifyPassword } from "@/lib";

// The team sign-in that closes both sites to the public while the app is in development.
//
// The credentials live in two config rows that are deliberately INACTIVE, in an inactive group:
// `GET /api/config/parameters/public?keyParams=` returns any active row by key, and
// `ConfigService.getAllConfigs` feeds the Parameters screen, so an active row would hand the
// password hash to the public and show it to every admin. That is why this file talks to Prisma
// directly instead of going through ConfigService.
const GROUP_NAME = "team_access";
const USERNAME_KEY = "team_access_username";
const HASH_KEY = "team_access_password_hash";

export const TEAM_SESSION_COOKIE = "lw_session";
export const TEAM_SESSION_SECONDS = 7 * 24 * 60 * 60;

// nginx asks `check` on every request, so the stored credentials are cached for a few seconds.
// Changing them clears the cache of the process that saved them; the other site's process
// notices within this window.
const CACHE_MS = 15_000;

interface Credentials {
  username: string;
  passwordHash: string;
}

let cache: { at: number; value: Credentials | null } | null = null;
let dummyHash: Promise<string> | null = null;

const secret = () => {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET is not set");
  return value;
};

const digest = (value: string) => createHash("sha256").update(value).digest();

const safeEqual = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

const readRows = async () => {
  const rows = await prisma.configParameter.findMany({ where: { key: { in: [USERNAME_KEY, HASH_KEY] } } });
  const username = rows.find((row) => row.key === USERNAME_KEY);
  const hash = rows.find((row) => row.key === HASH_KEY);
  return { username, hash };
};

const readCredentials = async (fresh = false): Promise<Credentials | null> => {
  if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.value;

  const { username, hash } = await readRows();
  const value = typeof username?.value === "string" && typeof hash?.value === "string" && username.value && hash.value ? { username: username.value, passwordHash: hash.value } : null;

  cache = { at: Date.now(), value };
  return value;
};

// Changes whenever the username or password does, so every existing session stops verifying.
const versionOf = ({ username, passwordHash }: Credentials) => digest(`${username}:${passwordHash}`).toString("hex").slice(0, 12);

const sign = (payload: string) => createHmac("sha256", secret()).update(`team-access|${payload}`).digest("base64url");

export const createSessionToken = (credentials: Credentials) => {
  const expires = Math.floor(Date.now() / 1000) + TEAM_SESSION_SECONDS;
  const payload = `${expires}.${versionOf(credentials)}`;
  return `${payload}.${sign(payload)}`;
};

export const verifySessionToken = async (token: string | undefined) => {
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [expires, version, signature] = parts;
  if (!safeEqual(signature, sign(`${expires}.${version}`))) return false;
  if (!(Number(expires) > Date.now() / 1000)) return false;

  const credentials = await readCredentials();
  return credentials !== null && version === versionOf(credentials);
};

/** Returns the credentials on a match, otherwise null. Takes the same time whichever part is wrong. */
export const checkLogin = async (username: string, password: string) => {
  const credentials = await readCredentials();

  // A real bcrypt comparison runs even when nothing is configured, so timing does not say so.
  dummyHash ??= hashPassword(createHash("sha256").update(secret()).digest("hex"));
  const passwordOk = await verifyPassword(password, credentials?.passwordHash ?? (await dummyHash));
  const usernameOk = credentials ? safeEqual(username.trim().toLowerCase(), credentials.username.toLowerCase()) : false;

  return credentials && usernameOk && passwordOk ? credentials : null;
};

export const getTeamAccessSummary = async () => {
  const { username, hash } = await readRows();
  const isConfigured = typeof username?.value === "string" && typeof hash?.value === "string" && Boolean(username.value) && Boolean(hash.value);

  return {
    username: isConfigured && typeof username?.value === "string" ? username.value : null,
    isConfigured,
    updatedAt: hash?.updatedAt ?? null,
  };
};

/** Saves the username and, when given, a new password. Without a password the current one is kept. */
export const saveTeamAccess = async ({ username, password }: { username: string; password?: string }) => {
  const current = await readCredentials(true);

  if (!password && !current) throw new Error("Set a password the first time");

  const passwordHash = password ? await hashPassword(password) : current!.passwordHash;

  const group = await prisma.configParameterGroup.upsert({
    where: { name: GROUP_NAME },
    update: { isActive: false },
    create: { name: GROUP_NAME, label: "Team access", description: "Sign-in for the team while the sites are closed. Hidden on purpose: holds a password hash.", isActive: false },
  });

  await prisma.$transaction([
    prisma.configParameter.upsert({
      where: { key: USERNAME_KEY },
      update: { value: username, isActive: false },
      create: { key: USERNAME_KEY, label: "Team access username", description: "Username for /team-login", value: username, type: "TEXT", groupId: group.id, isActive: false },
    }),
    prisma.configParameter.upsert({
      where: { key: HASH_KEY },
      update: { value: passwordHash, isActive: false },
      create: { key: HASH_KEY, label: "Team access password hash", description: "bcrypt hash, never shown", value: passwordHash, type: "TEXT", groupId: group.id, isActive: false },
    }),
  ]);

  cache = null;
};
