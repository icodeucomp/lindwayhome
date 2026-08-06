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
  CreateOrder,
  EditOrder,
  Order,
  EditConfigParameter,
  CreateLocation,
  UpdateLocation,
  CreateSize,
  UpdateSize,
  CreateSizeGuide,
  UpdateSizeGuide,
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
        if (params.locale) searchParams.append("locale", params.locale);
        if (params.branding) searchParams.append("branding", params.branding);
        if (params.garment) searchParams.append("garment", params.garment);
        if (params.audience) searchParams.append("audience", params.audience);
        if (params.sort) searchParams.append("sort", params.sort);
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
export const ordersApi = {
  useGetOrders: <T>({ key, params = {}, gcTime = GC_TIME, staleTime = STALE_TIME, enabled = true }: FetchOptions) => {
    return useQuery<T, Error>({
      queryKey: key,
      queryFn: async () => {
        const searchParams = new URLSearchParams();
        if (params.search) searchParams.append("search", params.search);
        if (params.order) searchParams.append("order", params.order);
        if (params.isPurchased) searchParams.append("isPurchased", params.isPurchased.toString());
        if (params.status) searchParams.append("status", params.status.toString());
        if (params.paymentMethod) searchParams.append("paymentMethod", params.paymentMethod.toString());
        if (params.limit) searchParams.append("limit", params.limit.toString());
        if (params.page) searchParams.append("page", params.page.toString());
        if (params.month) searchParams.append("month", params.month.toString());
        if (params.year) searchParams.append("year", params.year.toString());
        const { data } = await api.get(`/orders?${searchParams.toString()}`);
        return data;
      },
      gcTime,
      staleTime,
      enabled,
      retry: RETRY_TIMES,
    });
  },
  useGetOrder: <T>({ key, id, gcTime = GC_TIME, staleTime = STALE_TIME, enabled = true }: FetchOptions) => {
    return useQuery<T, Error>({
      queryKey: key,
      queryFn: async () => {
        const { data } = await api.get(`/orders/${id}`);
        return data;
      },
      gcTime,
      staleTime,
      enabled,
      retry: RETRY_TIMES,
    });
  },
  useUpdateOrder: ({ ...mutationOptions }: UseMutationOptions<Order, Error, { id: string; order: EditOrder }>) => {
    return useMutation({
      mutationFn: async ({ id, order }: { id: string; order: EditOrder }) => {
        try {
          const { data } = await api.put(`/orders/${id}`, order);
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
  useActivateMembership: ({ ...mutationOptions }: UseMutationOptions<Order, Error, string>) => {
    return useMutation({
      mutationFn: async (id: string) => {
        try {
          const { data } = await api.patch(`/orders/membership/${id}`);
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
  useDeleteOrder: ({ ...mutationOptions }: UseMutationOptions<Order, Error, string>) => {
    return useMutation({
      mutationFn: async (id: string) => {
        try {
          const { data } = await api.delete(`/orders/${id}`);
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

export const orderCheckoutApi = {
  useGetOrderCheckout: <T>({ key, params = {}, gcTime = GC_TIME, staleTime = STALE_TIME, enabled = true }: FetchOptions) => {
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
        const { data } = await api.get(`/orders/checkout?${searchParams.toString()}`);
        return data;
      },
      gcTime,
      staleTime,
      enabled,
      retry: RETRY_TIMES,
    });
  },
  useCreateOrder: ({ ...mutationOptions }: UseMutationOptions<Order, Error, CreateOrder>) => {
    return useMutation({
      mutationFn: async (order: CreateOrder) => {
        try {
          const { data } = await api.post("/orders/checkout", order);
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
  uploadImages: async (files: File | File[], onProgress?: (progress: number) => void): Promise<Files[]> => {
    const formData = new FormData();
    if (Array.isArray(files)) files.forEach((file) => formData.append("files", file));
    else formData.append("files", files);

    try {
      const response = await api.post("/files/uploads/images", formData, {
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
        throw error.response?.data?.message || "An error occurred while uploading images";
      }
      throw error;
    }
  },
  uploadVideos: async (files: File | File[], onProgress?: (progress: number) => void): Promise<Files[]> => {
    const formData = new FormData();
    if (Array.isArray(files)) files.forEach((file) => formData.append("files", file));
    else formData.append("files", files);

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

// Sizes & size guides Api
const mutation = <TInput>(run: (input: TInput) => Promise<{ data: { message?: string } }>) => {
  return async (input: TInput) => {
    try {
      const { data } = await run(input);
      toast.success(data.message || "Success");
      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data.message;
        if (Array.isArray(responseData)) throw new Error(responseData.map((err, index) => `${index + 1}. ${err.message}`).join("\n"));
        throw new Error(responseData || "An error occurred");
      }
      throw new Error("An unexpected error occurred");
    }
  };
};

const onMutationError = (error: unknown) => toast.error(error instanceof Error ? error.message : "An unknown error occurred");

export const sizesApi = {
  useGetSizes: <T>({ key, params = {}, gcTime = GC_TIME, staleTime = STALE_TIME, enabled = true }: FetchOptions) => {
    return useQuery<T, Error>({
      queryKey: key,
      queryFn: async () => {
        const searchParams = new URLSearchParams();
        if (params.isActive !== undefined) searchParams.append("isActive", params.isActive.toString());
        const { data } = await api.get(`/sizes?${searchParams.toString()}`);
        return data;
      },
      gcTime,
      staleTime,
      enabled,
      retry: RETRY_TIMES,
    });
  },
  useCreateSize: ({ ...mutationOptions }: UseMutationOptions<unknown, Error, CreateSize>) =>
    useMutation({ mutationFn: mutation<CreateSize>((body) => api.post("/sizes", body)), onError: onMutationError, ...mutationOptions }),
  useUpdateSize: ({ ...mutationOptions }: UseMutationOptions<unknown, Error, { id: string; size: UpdateSize }>) =>
    useMutation({ mutationFn: mutation<{ id: string; size: UpdateSize }>(({ id, size }) => api.put(`/sizes/${id}`, size)), onError: onMutationError, ...mutationOptions }),
  useDeleteSize: ({ ...mutationOptions }: UseMutationOptions<unknown, Error, string>) =>
    useMutation({ mutationFn: mutation<string>((id) => api.delete(`/sizes/${id}`)), onError: onMutationError, ...mutationOptions }),
};

export const sizeGuidesApi = {
  useGetSizeGuides: <T>({ key, params = {}, gcTime = GC_TIME, staleTime = STALE_TIME, enabled = true }: FetchOptions & { published?: boolean }) => {
    return useQuery<T, Error>({
      queryKey: key,
      queryFn: async () => {
        const searchParams = new URLSearchParams();
        if (params.locale) searchParams.append("locale", params.locale);
        const { data } = await api.get(`/size-guides?${searchParams.toString()}`);
        return data;
      },
      gcTime,
      staleTime,
      enabled,
      retry: RETRY_TIMES,
    });
  },
  useGetSizeGuide: <T>({ key, id, gcTime = GC_TIME, staleTime = STALE_TIME, enabled = true }: FetchOptions) => {
    return useQuery<T, Error>({
      queryKey: key,
      queryFn: async () => {
        // The form needs every locale, so it does not pass `locale` — the response
        // carries the raw `translations` array alongside the resolved fields.
        const { data } = await api.get(`/size-guides/${id}`);
        return data;
      },
      gcTime,
      staleTime,
      enabled,
      retry: RETRY_TIMES,
    });
  },
  useCreateSizeGuide: ({ ...mutationOptions }: UseMutationOptions<unknown, Error, CreateSizeGuide>) =>
    useMutation({ mutationFn: mutation<CreateSizeGuide>((body) => api.post("/size-guides", body)), onError: onMutationError, ...mutationOptions }),
  useUpdateSizeGuide: ({ ...mutationOptions }: UseMutationOptions<unknown, Error, { id: string; guide: UpdateSizeGuide }>) =>
    useMutation({ mutationFn: mutation<{ id: string; guide: UpdateSizeGuide }>(({ id, guide }) => api.put(`/size-guides/${id}`, guide)), onError: onMutationError, ...mutationOptions }),
  useDeleteSizeGuide: ({ ...mutationOptions }: UseMutationOptions<unknown, Error, string>) =>
    useMutation({ mutationFn: mutation<string>((id) => api.delete(`/size-guides/${id}`)), onError: onMutationError, ...mutationOptions }),
};
