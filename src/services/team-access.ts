import { createHash, createHmac, timingSafeEqual } from "crypto";

// Password gate for the beta site, enforced by `src/proxy.ts` when TEAM_ACCESS_GATE=true (set in
// docker-compose.beta.yml, never on main). The browser shows its own sign-in popup (HTTP Basic).
//
// One shared username and password from the env file (TEAM_ACCESS_USERNAME / TEAM_ACCESS_PASSWORD):
// whoever enters them is the team. Nothing is stored in the database. With either unset the gate
// stays shut for everyone.
//
// A browser keeps Basic credentials until it is closed and re-sends them on its own, so a plain
// Basic check could never expire. Two things make the session last TEAM_ACCESS_SESSION_HOURS:
//   - a signed `lw_session` cookie carries the login, and expires after that long;
//   - the popup's realm changes every period, and once a period has rolled over the first
//     request is always refused (with a signed `lw_chal` cookie) even if the browser re-sent the
//     old credentials. The browser sees an unknown realm, so it asks again, and only credentials
//     that arrive together with the fresh challenge cookie are accepted.
export const TEAM_SESSION_COOKIE = "lw_session";
export const TEAM_CHALLENGE_COOKIE = "lw_chal";

const DEFAULT_SESSION_HOURS = 24;

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

const mac = (label: string, payload: string) => createHmac("sha256", secret()).update(`${label}|${payload}`).digest("base64url");

// Different whenever the username or password is, and keyed with the server secret so a cookie
// reveals nothing about the password. Changing either signs everyone out.
const versionOf = ({ username, password }: Credentials) => createHmac("sha256", secret()).update(`version|${username}:${password}`).digest("hex").slice(0, 12);

const now = () => Math.floor(Date.now() / 1000);

export const isGateEnabled = () => process.env.TEAM_ACCESS_GATE === "true";

export const isConfigured = () => credentials() !== null;

export const sessionSeconds = () => {
  const hours = Number(process.env.TEAM_ACCESS_SESSION_HOURS);
  return Math.max(60, Math.round((Number.isFinite(hours) && hours > 0 ? hours : DEFAULT_SESSION_HOURS) * 3600));
};

const windowOf = (seconds: number) => Math.floor(seconds / sessionSeconds());

/** The popup's realm. It changes every session period, which is what makes the browser ask again. */
export const currentRealm = () => {
  const start = new Date(windowOf(now()) * sessionSeconds() * 1000);
  return `Lindway beta - team only (session ${start.toISOString().slice(0, 16).replace("T", " ")} UTC)`;
};

const issue = (label: string, number: number, current: Credentials) => {
  const payload = `${number}.${versionOf(current)}`;
  return `${payload}.${mac(label, payload)}`;
};

const verify = (label: string, token: string | undefined, accept: (number: number) => boolean) => {
  const current = credentials();
  if (!token || !current) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [number, version, signature] = parts;
  if (!safeEqual(signature, mac(label, `${number}.${version}`))) return false;
  return version === versionOf(current) && accept(Number(number));
};

/** A login that lasts one session period from now. */
export const createSessionToken = () => issue("session", now() + sessionSeconds(), credentials()!);

export const verifySessionToken = (token: string | undefined) => verify("session", token, (expires) => expires > now());

/** Proof that this browser was challenged in the current period. Credentials count only alongside it. */
export const createChallengeToken = () => issue("challenge", windowOf(now()), credentials()!);

export const verifyChallengeToken = (token: string | undefined) => verify("challenge", token, (window) => window === windowOf(now()));

/** The username and password from an `Authorization: Basic ...` header, or null. */
export const parseBasicAuth = (header: string | null) => {
  if (!header?.startsWith("Basic ")) return null;

  try {
    const decoded = Buffer.from(header.slice(6).trim(), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    return separator < 0 ? null : { username: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
  } catch {
    return null;
  }
};

/** True when the username and password match. Both are always compared, so timing does not say which was wrong. */
export const checkLogin = (username: string, password: string) => {
  const current = credentials();
  if (!current) return false;

  const usernameOk = safeEqual(username.trim().toLowerCase(), current.username.toLowerCase());
  const passwordOk = safeEqual(password, current.password);
  return usernameOk && passwordOk;
};
