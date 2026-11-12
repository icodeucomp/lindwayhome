"use client";

import * as React from "react";

import { useQueryClient } from "@tanstack/react-query";

import { PiEye, PiEyeSlash } from "react-icons/pi";

import { useAuthStore } from "@/hooks";

import { teamAccessApi } from "@/utils";

import { ApiResponse, TeamAccessSummary } from "@/types";

import { AdminButton, Badge, ErrorState, Field, LoadingState, PageHeader, Panel, Spinner, TextInput } from "./slicing";

export const TeamAccessDashboard = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading, isError, refetch } = teamAccessApi.useGetTeamAccess<ApiResponse<TeamAccessSummary>>({ key: ["team-access"], enabled: isAuthenticated });

  // Only what the admin typed is state; the saved username always comes from the server.
  const [usernameEdit, setUsernameEdit] = React.useState<string | null>(null);
  const [password, setPassword] = React.useState<string>("");
  const [confirm, setConfirm] = React.useState<string>("");
  const [showPassword, setShowPassword] = React.useState<boolean>(false);

  const summary = data?.data;
  const username = usernameEdit ?? summary?.username ?? "";
  const isConfigured = Boolean(summary?.isConfigured);

  const update = teamAccessApi.useUpdateTeamAccess({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-access"] });
      setUsernameEdit(null);
      setPassword("");
      setConfirm("");
    },
  });

  const passwordError = password && password.length < 8 ? "At least 8 characters" : undefined;
  const confirmError = confirm && confirm !== password ? "Passwords do not match" : undefined;
  const usernameError = username && username.trim().length < 3 ? "At least 3 characters" : undefined;

  const hasChanges = (usernameEdit !== null && usernameEdit !== summary?.username) || password.length > 0;
  const canSave = hasChanges && username.trim().length >= 3 && !passwordError && !confirmError && (isConfigured || password.length >= 8);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSave) return;
    update.mutate({ username: username.trim(), ...(password ? { password } : {}) });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Team access"
        description="The username and password the team uses on the sign-in page (/team-login) while lindwayhome.com and beta.lindwayhome.com are closed to the public. Saving a change signs everyone out."
      />

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <Panel className="w-full max-w-xl">
          <div className="flex items-center justify-between gap-4 mb-6">
            <p className="admin-eyebrow">Sign-in</p>
            <Badge className={isConfigured ? "text-emerald-700 border-emerald-700/30" : "text-red-700 border-red-700/30"}>{isConfigured ? "Configured" : "Not set"}</Badge>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <Field label="Username" htmlFor="team-username" required error={usernameError} hint="Letters, numbers and . _ @ - only">
              <TextInput id="team-username" autoComplete="off" value={username} onChange={(event) => setUsernameEdit(event.target.value)} placeholder="team" invalid={Boolean(usernameError)} />
            </Field>

            <Field
              label={isConfigured ? "New password" : "Password"}
              htmlFor="team-password"
              required={!isConfigured}
              error={passwordError}
              hint={isConfigured ? "Leave empty to keep the current password" : "At least 8 characters"}
            >
              <div className="relative">
                <TextInput
                  id="team-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pr-10"
                  placeholder="••••••••"
                  invalid={Boolean(passwordError)}
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

            <Field label="Confirm password" htmlFor="team-confirm" required={password.length > 0} error={confirmError}>
              <TextInput
                id="team-confirm"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="••••••••"
                invalid={Boolean(confirmError)}
              />
            </Field>

            <div className="flex items-center justify-between gap-4 pt-2">
              <p className="text-xs text-body/50">{summary?.updatedAt ? `Last changed ${new Date(summary.updatedAt).toLocaleString()}` : "Never set"}</p>
              <AdminButton type="submit" variant="solid" disabled={!canSave || update.isPending}>
                {update.isPending && <Spinner />}
                {update.isPending ? "Saving…" : "Save changes"}
              </AdminButton>
            </div>
          </form>
        </Panel>
      )}
    </div>
  );
};
