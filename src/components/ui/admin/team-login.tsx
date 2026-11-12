"use client";

import { useState } from "react";

import { PiEye, PiEyeSlash, PiWarningCircle, PiCheckCircle } from "react-icons/pi";

import { useForm } from "@/hooks";

import { AdminButton, Field, Spinner, TextInput } from "./slicing";

// Only ever a same-site path: this is a redirect target taken from the query string.
const safeNext = () => {
  const next = new URLSearchParams(window.location.search).get("next") ?? "/";
  return next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/";
};

/** Sign-in for the closed sites. Same look as the admin login; talks to /api/team-access/login. */
export const TeamLogin = () => {
  const [values, handleChange] = useForm<{ username: string; password: string }>({ username: "", password: "" });

  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [isPending, setIsPending] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!values.username || !values.password) {
      setError("Username or password cannot be empty");
      return;
    }

    setIsPending(true);
    try {
      const response = await fetch("/api/team-access/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        setError(response.status === 429 ? "Too many attempts. Please wait a minute and try again." : (result?.message ?? "Sign in failed. Please try again."));
        setIsPending(false);
        return;
      }

      setSuccess("Signed in");
      window.location.assign(safeNext());
    } catch {
      setError("Could not reach the server. Please try again.");
      setIsPending(false);
    }
  };

  const isLoading = isPending || Boolean(success);

  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-12 bg-sidebar">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="admin-eyebrow">Team access</p>
          <h1 className="mt-2 text-3xl font-normal font-heading text-body">Lindway Home</h1>
        </div>

        <div className="p-8 border rounded-sm bg-light border-border">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <p className="flex items-start gap-2 px-3 py-2.5 text-sm text-red-700 border rounded-sm border-red-700/25 bg-red-700/5">
                <PiWarningCircle className="mt-0.5 size-4 shrink-0" />
                {error}
              </p>
            )}
            {success && (
              <p className="flex items-start gap-2 px-3 py-2.5 text-sm border rounded-sm text-emerald-700 border-emerald-700/25 bg-emerald-700/5">
                <PiCheckCircle className="mt-0.5 size-4 shrink-0" />
                {success}
              </p>
            )}

            <Field label="Username" htmlFor="username" required>
              <TextInput id="username" name="username" type="text" autoComplete="username" disabled={isLoading} value={values.username} onChange={handleChange} placeholder="Your username" />
            </Field>

            <Field label="Password" htmlFor="password" required>
              <div className="relative">
                <TextInput
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  disabled={isLoading}
                  value={values.password}
                  onChange={handleChange}
                  className="pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute -translate-y-1/2 cursor-pointer right-3 top-1/2 text-body/40 hover:text-body"
                >
                  {showPassword ? <PiEyeSlash className="size-4" /> : <PiEye className="size-4" />}
                </button>
              </div>
            </Field>

            <AdminButton type="submit" variant="solid" disabled={isLoading} className="w-full">
              {isPending && <Spinner />}
              {isPending ? "Signing in…" : success ? "Redirecting…" : "Sign in"}
            </AdminButton>
          </form>
        </div>

        <p className="mt-6 text-xs text-center text-body/45">This site is not open to the public yet. Team members only.</p>
      </div>
    </div>
  );
};
