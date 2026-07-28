"use client";

import { useState } from "react";

import { AxiosError } from "axios";

import { useRouter } from "next/navigation";

import { useMutation } from "@tanstack/react-query";

import { FaCheckCircle, FaExclamationCircle, FaEye, FaEyeSlash, FaLock, FaUser } from "react-icons/fa";

import { useAuthStore, useForm } from "@/hooks";

import { Button, Img } from "@/components";

import { authApi } from "@/utils";

import { LoginRequest } from "@/types";

export const Login = () => {
  const [values, handleChange] = useForm<LoginRequest>({ username: "", password: "" });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const router = useRouter();

  const { login } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      login(data.data.user, data.data.token);
      setSuccess(data.message);
      setTimeout(() => {
        router.push("/admin/dashboard");
      }, 2000);
    },
    onError: (error: AxiosError<{ message: string }>) => {
      setErrors({
        general: error.response?.data.message || "Login failed. Please try again.",
      });
    },
  });

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    if (!values.username || !values.password) {
      setErrors({ general: "Username or password cannot be empty" });
      return;
    }

    loginMutation.mutate(values);
  };

  const isLoading = loginMutation.isPending || !!success;

  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-12 bg-gray/10">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <Img src="/icons/dark-logo.png" alt="lindway logo" className="w-32 h-12" cover />
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-gray/70">Admin Panel</span>
        </div>

        {/* Card */}
        <div className="p-6 border shadow-lg rounded-2xl border-gray/15 bg-light sm:p-8">
          <div className="mb-6 space-y-1 text-center">
            <h1 className="text-2xl font-bold text-darker-gray">Welcome back</h1>
            <p className="text-sm text-gray">Sign in to continue managing your store.</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {errors.general && (
              <div className="flex items-start gap-2 px-4 py-3 text-sm text-red-600 border border-red-200 rounded-lg bg-red-50">
                <FaExclamationCircle className="mt-0.5 shrink-0" />
                <span>{errors.general}</span>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2 px-4 py-3 text-sm text-green-600 border border-green-200 rounded-lg bg-green-50">
                <FaCheckCircle className="mt-0.5 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-sm font-medium text-darker-gray">
                Username
              </label>
              <div className="relative">
                <FaUser className="absolute -translate-y-1/2 pointer-events-none left-3 top-1/2 text-gray/50" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  disabled={isLoading}
                  value={values.username}
                  onChange={handleChange}
                  className="pl-10 input-form disabled:bg-gray/5"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-darker-gray">
                Password
              </label>
              <div className="relative">
                <FaLock className="absolute -translate-y-1/2 pointer-events-none left-3 top-1/2 text-gray/50" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  disabled={isLoading}
                  value={values.password}
                  onChange={handleChange}
                  className="px-10 input-form disabled:bg-gray/5"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute -translate-y-1/2 cursor-pointer right-3 top-1/2 text-gray/50 hover:text-gray"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="flex items-center justify-center w-full gap-2 py-2.5 btn-gray">
              {loginMutation.isPending && <span className="inline-block border-2 rounded-full size-4 border-light/40 border-t-light animate-spin" />}
              {loginMutation.isPending ? "Signing in..." : success ? "Redirecting..." : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-xs text-center text-gray/70">Authorized access only. Contact your administrator if you need an account.</p>
      </div>
    </div>
  );
};
