import axios from "axios";

import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  Product,
  CreateProduct,
  EditProduct,
  Files,
  ProductsQueryParams,
  CreateGuest,
  EditGuest,
  Guest,
  EditConfigParameter,
  CreateLocation,
  UpdateLocation,
} from "@/types";

import { QueryKey, useMutation, UseMutationOptions, useQuery } from "@tanstack/react-query";

import toast from "react-hot-toast";

export const API_BASE_URL = process.env.NODE_ENV === "production" ? process.env.NEXT_PUBLIC_BASE_URL : "http://localhost:3000";
const GC_TIME = 6 * 60 * 60 * 1000;
const STALE_TIME = 6 * 60 * 60 * 1000;
const RETRY_TIMES = 3;

interface FetchOptions {
  key: QueryKey;
  id?: string;
  params?: ProductsQueryParams;
  gcTime?: number;
  staleTime?: number;
  enabled?: boolean;
}

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    Accept: "application/json",
    "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post("/auth/login", data);
    return response.data;
  },
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post("/auth/register", data);
    return response.data;
  },
};

// Products API
export const productsApi = {
  useGetProducts: <T>({ key, params = {}, gcTime = GC_TIME, staleTime = STALE_TIME, enabled = true }: FetchOptions) => {
    return useQuery<T, Error>({
      queryKey: key,
      queryFn: async () => {
        const searchParams = new URLSearchParams();
        if (params.category) searchParams.append("category", params.category);
        if (params.search) searchParams.append("search", params.search);
        if (params.order) searchParams.append("order", params.order);
        if (params.isActive !== undefined) searchParams.append("isActive", params.isActive.toString());
        if (params.isFavorite !== undefined) searchParams.append("isFavorite", params.isFavorite.toString());
        if (params.limit) searchParams.append("limit", params.limit.toString());
        if (params.page) searchParams.append("page", params.page.toString());
        if (params.month) searchParams.append("month", params.month.toString());
        if (params.year) searchParams.append("year", params.year.toString());
        const { data } = await api.get(`/products?${searchParams.toString()}`);
        return data;
      },
      gcTime,
      staleTime,
      enabled,
      retry: RETRY_TIMES,
    });
  },
  useGetProduct: <T>({ key, id, gcTime = GC_TIME, staleTime = STALE_TIME, enabled = true }: FetchOptions) => {
    return useQuery<T, Error>({
      queryKey: key,
      queryFn: async () => {
        const { data } = await api.get(`/products/${id}`);
        return data;
      },
      gcTime,
      staleTime,
      enabled,
      retry: 3,
    });
  },
  useCreateProducts: ({ ...mutationOptions }: UseMutationOptions<Product, Error, CreateProduct>) => {
    return useMutation({
      mutationFn: async (newItem: CreateProduct) => {
        try {
          const { data } = await api.post("/products", newItem);
          toast.success(data.message || "Success adding data");
          return data.data;
        } catch (error) {
          if (axios.isAxiosError(error)) {
            const responseData = error.response?.data.message;
            if (Array.isArray(responseData)) {
              const errorMessages = responseData.map((err, index) => `${index + 1}. ${err.message}`).join("\n");
              throw new Error(errorMessages);
            } else {
              throw new Error(responseData || "An error occurred");
            }
          }
          throw new Error("An unexpected error occurred");
        }
      },
      onError: (error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        toast.error(errorMessage);
      },
      ...mutationOptions,
    });
  },
  useUpdateProduct: ({ ...mutationOptions }: UseMutationOptions<Product, Error, { id: string; updatedItem: EditProduct }>) => {
    return useMutation({
      mutationFn: async ({ id, updatedItem }: { id: string; updatedItem: EditProduct }) => {
        try {
          const { data } = await api.put(`/products/${id}`, updatedItem);
          toast.success(data.message || "Success updating data");
          return data.data;
        } catch (error) {
          if (axios.isAxiosError(error)) {
            const responseData = error.response?.data.message;
            if (Array.isArray(responseData)) {
              const errorMessages = responseData.map((err, index) => `${index + 1}. ${err.message}`).join("\n");
              throw new Error(errorMessages);
            } else {
              throw new Error(responseData || "An error occurred");
            }
          }
          throw new Error("An unexpected error occurred");
        }
      },
      onError: (error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        toast.error(errorMessage);
      },
      ...mutationOptions,
    });
  },
  useDeleteProduct: ({ ...mutationOptions }: UseMutationOptions<Product, Error, string>) => {
    return useMutation({
      mutationFn: async (id: string) => {
        try {
          const { data } = await api.delete(`/products/${id}`);
          toast.success(data.message || "Success deleting data");
          return data.data;
        } catch (error) {
          if (axios.isAxiosError(error)) {
            const responseMessage = error.response?.data.message;
            throw new Error(responseMessage || "An error occurred");
          }
          throw new Error("An unexpected error occurred");
        }
      },
      onError: (error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        toast.error(errorMessage);
      },
      ...mutationOptions,
    });
  },
};

// Guests Api
export const guestsApi = {
  useGetGuests: <T>({ key, params = {}, gcTime = GC_TIME, staleTime = STALE_TIME, enabled = true }: FetchOptions) => {
    return useQuery<T, Error>({
      queryKey: key,
      queryFn: async () => {
        const searchParams = new URLSearchParams();
        if (params.search) searchParams.append("search", params.search);
        if (params.order) searchParams.append("order", params.order);
        if (params.isPurchased !== undefined) searchParams.append("isPurchased", params.isPurchased.toString());
        if (params.limit) searchParams.append("limit", params.limit.toString());
        if (params.page) searchParams.append("page", params.page.toString());
        if (params.month) searchParams.append("month", params.month.toString());
        if (params.year) searchParams.append("year", params.year.toString());
        const { data } = await api.get(`/guests?${searchParams.toString()}`);
        return data;
      },
      gcTime,
      staleTime,
      enabled,
      retry: RETRY_TIMES,
    });
  },
  useGetGuest: <T>({ key, id, gcTime = GC_TIME, staleTime = STALE_TIME, enabled = true }: FetchOptions) => {
    return useQuery<T, Error>({
      queryKey: key,
      queryFn: async () => {
        const { data } = await api.get(`/guests/${id}`);
        return data;
      },
      gcTime,
      staleTime,
      enabled,
      retry: RETRY_TIMES,
    });
  },
  useUpdateGuests: ({ ...mutationOptions }: UseMutationOptions<Guest, Error, { id: string; guests: EditGuest }>) => {
    return useMutation({
      mutationFn: async ({ id, guests }: { id: string; guests: EditGuest }) => {
        try {
          const { data } = await api.put(`/guests/${id}`, guests);
          toast.success(data.message || "Success updating transaction");
          return data.data;
        } catch (error) {
          if (axios.isAxiosError(error)) {
            const responseData = error.response?.data.message;
            if (Array.isArray(responseData)) {
              const errorMessages = responseData.map((err, index) => `${index + 1}. ${err.message}`).join("\n");
              throw new Error(errorMessages);
            } else {
              throw new Error(responseData || "An error occurred");
            }
          }
          throw new Error("An unexpected error occurred");
        }
      },
      onError: (error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        toast.error(errorMessage);
      },
      ...mutationOptions,
    });
  },
  useUpdateMembershipGuests: ({ ...mutationOptions }: UseMutationOptions<Guest, Error, string>) => {
    return useMutation({
      mutationFn: async (id: string) => {
        try {
          const { data } = await api.patch(`/guests/membership/${id}`);
          toast.success(data.message || "Membership activated successfully");
          return data.data;
        } catch (error) {
          if (axios.isAxiosError(error)) {
            const responseData = error.response?.data.message;
            if (Array.isArray(responseData)) {
              const errorMessages = responseData.map((err, index) => `${index + 1}. ${err.message}`).join("\n");
              throw new Error(errorMessages);
            } else {
              throw new Error(responseData || "An error occurred");
            }
          }
          throw new Error("An unexpected error occurred");
        }
      },
      onError: (error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        toast.error(errorMessage);
      },
      ...mutationOptions,
    });
  },
  useDeleteGuests: ({ ...mutationOptions }: UseMutationOptions<Guest, Error, string>) => {
    return useMutation({
      mutationFn: async (id: string) => {
        try {
          const { data } = await api.delete(`/guests/${id}`);
          toast.success(data.message || "Success deleting transaction");
          return data.data;
        } catch (error) {
          if (axios.isAxiosError(error)) {
            const responseMessage = error.response?.data.message;
            throw new Error(responseMessage || "An error occurred");
          }
          throw new Error("An unexpected error occurred");
        }
      },
      onError: (error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        toast.error(errorMessage);
      },
      ...mutationOptions,
    });
  },
};

export const guestCheckoutApi = {
  useGetGuestCheckouts: <T>({ key, params = {}, gcTime = GC_TIME, staleTime = STALE_TIME, enabled = true }: FetchOptions) => {
    return useQuery<T, Error>({
      queryKey: key,
      queryFn: async () => {
        const searchParams = new URLSearchParams();
        if (params.province) searchParams.append("province", params.province);
        if (params.district) searchParams.append("district", params.district);
        if (params.sub_district) searchParams.append("sub_district", params.sub_district);
        if (params.village) searchParams.append("village", params.village);
        if (params.email) searchParams.append("email", params.email);
        if (params.items) searchParams.append("items", JSON.stringify(params.items));
        if (params.purchased) searchParams.append("purchased", params.purchased.toString());
        if (params.totalItemsSold) searchParams.append("totalItemsSold", params.totalItemsSold.toString());
        const { data } = await api.get(`/guests/checkout?${searchParams.toString()}`);
        return data;
      },
      gcTime,
      staleTime,
      enabled,
      retry: RETRY_TIMES,
    });
  },
  useCreateGuestCheckouts: ({ ...mutationOptions }: UseMutationOptions<Guest, Error, CreateGuest>) => {
    return useMutation({
      mutationFn: async (guests: CreateGuest) => {
        try {
          const { data } = await api.post("/guests/checkout", guests);
          toast.success(data.message || "Thank you for your purchase!");
          return data.data;
        } catch (error) {
          if (axios.isAxiosError(error)) {
            const responseData = error.response?.data.message;
            if (Array.isArray(responseData)) {
              const errorMessages = responseData.map((err, index) => `${index + 1}. ${err.message}`).join("\n");
              throw new Error(errorMessages);
            } else {
              throw new Error(responseData || "An error occurred");
            }
          }
          throw new Error("An unexpected error occurred");
        }
      },
      onError: (error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        toast.error(errorMessage);
      },
      ...mutationOptions,
    });
  },
};

// Config Parameters Api
export const configParametersApi = {
  useGetConfigParametersPublic: <T>({ key, keyParams, gcTime = GC_TIME, staleTime = STALE_TIME, enabled = true }: FetchOptions & { keyParams?: string[] }) => {
    return useQuery<T, Error>({
      queryKey: [...key, keyParams],
      queryFn: async () => {
        const searchParams = new URLSearchParams();

        if (keyParams && keyParams.length > 0) {
          keyParams.forEach((param) => {
            searchParams.append("keyParams", param);
          });
        }

        const queryString = searchParams.toString();
        const url = queryString ? `/config/parameters/public?${queryString}` : "/config/parameters/public";

        const { data } = await api.get(url);
        return data;
      },
      gcTime,
      staleTime,
      enabled: enabled && (!keyParams || keyParams.length > 0),
      retry: RETRY_TIMES,
    });
  },
  useGetConfigParameters: <T>({ key, gcTime = GC_TIME, staleTime = STALE_TIME, enabled = true }: FetchOptions) => {
    return useQuery<T, Error>({
      queryKey: key,
      queryFn: async () => {
        const { data } = await api.get(`/config/parameters`);
        return data;
      },
      gcTime,
      staleTime,
      enabled,
    });
  },
  useUpdateConfigParameters: ({ ...mutationOptions }: UseMutationOptions<string, Error, EditConfigParameter>) => {
    return useMutation({
      mutationFn: async (parameter: EditConfigParameter) => {
        try {
          const { data } = await api.put(`/config/parameters`, parameter);
          toast.success(data.message || "Success updating transaction");
          return data.message;
        } catch (error) {
          if (axios.isAxiosError(error)) {
            const responseData = error.response?.data.message;
            throw new Error(responseData || "An error occurred");
          }
          throw new Error("An unexpected error occurred");
        }
      },
      onError: (error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        toast.error(errorMessage);
      },
      ...mutationOptions,
    });
  },
};

export const locationsApi = {
  useGetLocations: <T>({ key, params = {}, gcTime = GC_TIME, staleTime = STALE_TIME, enabled = true }: FetchOptions) => {
    return useQuery<T, Error>({
      queryKey: key,
      queryFn: async () => {
        const searchParams = new URLSearchParams();
        if (params.search) searchParams.append("search", params.search);
        if (params.province) searchParams.append("province", params.province);
        if (params.district) searchParams.append("district", params.district);
        if (params.sub_district) searchParams.append("sub_district", params.sub_district);
        if (params.limit) searchParams.append("limit", params.limit.toString());
        if (params.page) searchParams.append("page", params.page.toString());
        const { data } = await api.get(`/locations?${searchParams.toString()}`);
        return data;
      },
      gcTime,
      staleTime,
      enabled,
      retry: RETRY_TIMES,
    });
  },

  useGetMappingLocations: <T>({ key, params = {}, gcTime = GC_TIME, staleTime = STALE_TIME, enabled = true }: FetchOptions) => {
    return useQuery<T, Error>({
      queryKey: key,
      queryFn: async () => {
        const searchParams = new URLSearchParams();
        if (params.type) searchParams.append("type", params.type);
        if (params.province) searchParams.append("province", params.province);
        if (params.district) searchParams.append("district", params.district);
        if (params.sub_district) searchParams.append("sub_district", params.sub_district);
        const { data } = await api.get(`/locations/checkout?${searchParams.toString()}`);
        return data;
      },
      gcTime,
      staleTime,
      enabled,
      retry: RETRY_TIMES,
    });
  },

  useGetLocation: <T>({ key, id, gcTime = GC_TIME, staleTime = STALE_TIME, enabled = true }: FetchOptions) => {
    return useQuery<T, Error>({
      queryKey: key,
      queryFn: async () => {
        const { data } = await api.get(`/locations/${id}`);
        return data;
      },
      gcTime,
      staleTime,
      enabled,
      retry: RETRY_TIMES,
    });
  },

  useCreateLocation: ({ ...mutationOptions }: UseMutationOptions<Location, Error, CreateLocation>) => {
    return useMutation({
      mutationFn: async (newLocation: CreateLocation) => {
        try {
          const { data } = await api.post("/locations", newLocation);
          toast.success(data.message || "Success adding location");
          return data.data;
        } catch (error) {
          if (axios.isAxiosError(error)) {
            const responseData = error.response?.data.message;
            if (Array.isArray(responseData)) {
              const errorMessages = responseData.map((err, index) => `${index + 1}. ${err.message}`).join("\n");
              throw new Error(errorMessages);
            } else {
              throw new Error(responseData || "An error occurred");
            }
          }
          throw new Error("An unexpected error occurred");
        }
      },
      onError: (error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        toast.error(errorMessage);
      },
      ...mutationOptions,
    });
  },

  useUpdateLocation: ({ ...mutationOptions }: UseMutationOptions<Location, Error, { id: string; updatedLocation: UpdateLocation }>) => {
    return useMutation({
      mutationFn: async ({ id, updatedLocation }: { id: string; updatedLocation: UpdateLocation }) => {
        try {
          const { data } = await api.put(`/locations/${id}`, updatedLocation);
          toast.success(data.message || "Success updating location");
          return data.data;
        } catch (error) {
          if (axios.isAxiosError(error)) {
            const responseData = error.response?.data.message;
            if (Array.isArray(responseData)) {
              const errorMessages = responseData.map((err, index) => `${index + 1}. ${err.message}`).join("\n");
              throw new Error(errorMessages);
            } else {
              throw new Error(responseData || "An error occurred");
            }
          }
          throw new Error("An unexpected error occurred");
        }
      },
      onError: (error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        toast.error(errorMessage);
      },
      ...mutationOptions,
    });
  },

  useDeleteLocation: ({ ...mutationOptions }: UseMutationOptions<Location, Error, string>) => {
    return useMutation({
      mutationFn: async (id: string) => {
        try {
          const { data } = await api.delete(`/locations/${id}`);
          toast.success(data.message || "Success deleting location");
          return data.data;
        } catch (error) {
          if (axios.isAxiosError(error)) {
            const responseMessage = error.response?.data.message;
            throw new Error(responseMessage || "An error occurred");
          }
          throw new Error("An unexpected error occurred");
        }
      },
      onError: (error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        toast.error(errorMessage);
      },
      ...mutationOptions,
    });
  },
};

// Dashboard Api
export const dashboardApi = {
  useGetDashboard: <T>({ key, params = {}, gcTime = GC_TIME, staleTime = STALE_TIME, enabled = true }: FetchOptions) => {
    return useQuery<T, Error>({
      queryKey: key,
      queryFn: async () => {
        const searchParams = new URLSearchParams();
        if (params.month) searchParams.append("month", params.month.toString());
        if (params.year) searchParams.append("year", params.year.toString());
        const { data } = await api.get(`/dashboard?${searchParams.toString()}`);
        return data;
      },
      gcTime,
      staleTime,
      enabled,
      retry: RETRY_TIMES,
    });
  },
};

// Files Api
export const filesApi = {
  uploadImages: async (files: File | File[], subPath: string, onProgress?: (progress: number) => void): Promise<Files[]> => {
    const formData = new FormData();
    if (Array.isArray(files)) files.forEach((file) => formData.append("files", file));
    else formData.append("files", files);

    formData.append("subPath", subPath);

    try {
      const response = await api.post("/files/uploads/images", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            onProgress(progress);
          }
        },
        timeout: 300000,
      });
      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw error.response?.data?.message || "An error occurred while uploading images";
      }
      throw error;
    }
  },
  uploadVideos: async (files: File | File[], onProgress?: (progress: number) => void): Promise<Files[]> => {
    const formData = new FormData();
    if (Array.isArray(files)) {
      files.forEach((file) => {
        formData.append("files", file);
      });
    } else {
      formData.append("files", files);
    }

    try {
      const response = await api.post("/files/uploads/videos", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            onProgress(progress);
          }
        },
        timeout: 300000,
      });
      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw error.response?.data.message || "An error occurred while uploading videos";
      }
      throw error;
    }
  },
  delete: async (subPath: string, onProgress?: (progress: number) => void): Promise<boolean> => {
    try {
      const response = await api.post(
        "/files/deletes",
        { subPath },
        {
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total && onProgress) {
              const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
              onProgress(progress);
            }
          },
          timeout: 300000,
        },
      );
      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw error.response?.data?.message || "An error occurred while deleting files";
      }
      throw error;
    }
  },
};
