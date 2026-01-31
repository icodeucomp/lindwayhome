"use client";

import { useState } from "react";

import { AxiosError } from "axios";

import { useRouter } from "next/navigation";

import { useMutation } from "@tanstack/react-query";

import { useAuthStore, useForm } from "@/hooks";

import { Button } from "@/components";

import { authApi } from "@/utils";

import { LoginRequest } from "@/types";

export const Login = () => {
  const [values, handleChange] = useForm<LoginRequest>({ username: "", password: "" });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string>("");

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!values.username || !values.password) {
      setErrors({ general: "Username or password cannot be empty" });
      return;
    }

    loginMutation.mutate(values);
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-12 bg-dark/10 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-center text-gray">Sign in to your account</h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {errors.general && <div className="px-4 py-3 text-red-600 border border-red-200 rounded-lg bg-red-50">{errors.general}</div>}
          {success && <div className="px-4 py-3 text-green-600 border border-green-200 rounded-lg bg-green-50">{success}</div>}

          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray">
                Username
              </label>
              <input id="username" name="username" type="username" value={values.username} onChange={handleChange} className="input-form" placeholder="Enter your username" />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray">
                Password
              </label>
              <input id="password" name="password" type="password" value={values.password} onChange={handleChange} className="input-form" placeholder="Enter your password" />
            </div>
          </div>

          <Button type="submit" disabled={loginMutation.isPending} className={`w-full btn-gray disabled:opacity-50 ${loginMutation.isPending && "animate-pulse"}`}>
            {loginMutation.isPending ? "Signing in..." : "Sign in"}
          </Button>

          {/* <div className="text-center">
            <span className="text-sm text-gray-600">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
                Sign up
              </Link>
            </span>
          </div> */}
        </form>
      </div>
    </div>
  );
};
