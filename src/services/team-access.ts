import { createHash, createHmac, timingSafeEqual } from "crypto";

// The team sign-in that closes both sites to the public while the app is in development.
//
// One shared username and password, set in the server's env file (TEAM_ACCESS_USERNAME and
// TEAM_ACCESS_PASSWORD). Whoever presents them is the team: there are no per-person accounts and
// nothing is stored in the database. With either variable unset nobody can sign in, and the sites
// stay closed.
export const TEAM_SESSION_COOKIE = "lw_session";
export const TEAM_SESSION_SECONDS = 7 * 24 * 60 * 60;

interface Credentials {
  username: string;
  password: string;
}

const secret = () => {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET is not set");
  return value;
};

const credentials = (): Credentials | null => {
  const username = process.env.TEAM_ACCESS_USERNAME;
  const password = process.env.TEAM_ACCESS_PASSWORD;
  return username && password ? { username, password } : null;
};

const digest = (value: string) => createHash("sha256").update(value).digest();

const safeEqual = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

const sign = (payload: string) => createHmac("sha256", secret()).update(`team-access|${payload}`).digest("base64url");

// Keyed with the server secret so the cookie reveals nothing about the password, and different
// whenever the username or password is, so changing either signs everyone out.
const versionOf = ({ username, password }: Credentials) => createHmac("sha256", secret()).update(`version|${username}:${password}`).digest("hex").slice(0, 12);

export const createSessionToken = () => {
  const current = credentials();
  if (!current) throw new Error("Team access is not configured");

  const expires = Math.floor(Date.now() / 1000) + TEAM_SESSION_SECONDS;
  const payload = `${expires}.${versionOf(current)}`;
  return `${payload}.${sign(payload)}`;
};

export const verifySessionToken = (token: string | undefined) => {
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [expires, version, signature] = parts;
  if (!safeEqual(signature, sign(`${expires}.${version}`))) return false;
  if (!(Number(expires) > Date.now() / 1000)) return false;

  const current = credentials();
  return current !== null && version === versionOf(current);
};

/** True when the username and password match. Both are always compared, so timing does not say which was wrong. */
export const checkLogin = (username: string, password: string) => {
  const current = credentials();
  if (!current) return false;

  const usernameOk = safeEqual(username.trim().toLowerCase(), current.username.toLowerCase());
  const passwordOk = safeEqual(password, current.password);
  return usernameOk && passwordOk;
};
