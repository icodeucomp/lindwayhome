"use client";

import React, { useState } from "react";

import { useSearchPagination } from "@/hooks";

import { useQueryClient } from "@tanstack/react-query";

import { LocationLists } from "./slicing";

import { Button, Modal } from "@/components";

import { FaSearch } from "react-icons/fa";

import { locationsApi } from "@/utils";

import { Location, CreateLocation, UpdateLocation, ApiResponse } from "@/types";

interface FormData {
  code: string;
  province: string;
  district: string;
  sub_district: string;
  village: string;
  approx_lat: string;
  approx_long: string;
}

const initialFormData: FormData = {
  code: "",
  province: "",
  district: "",
  sub_district: "",
  village: "",
  approx_lat: "",
  approx_long: "",
};

export const LocationsDashboard = () => {
  const queryClient = useQueryClient();

  // Use custom pagination hook
  const { searchQuery, inputValue, setInputValue, handleSearch, currentPage, handlePageChange } = useSearchPagination({
    defaultPage: 1,
    searchParamName: "search",
    pageParamName: "page",
  });

  const [itemsPerPage] = useState(10);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<FormData>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // React Query - Fetch locations
  const { data: locationsData, isLoading } = locationsApi.useGetLocations<ApiResponse<Location[]>>({
    key: ["locations", currentPage, searchQuery],
    params: {
      page: currentPage,
      limit: itemsPerPage,
      search: searchQuery,
    },
  });

  // React Query - Create mutation
  const createMutation = locationsApi.useCreateLocation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setIsModalOpen(false);
      setFormData(initialFormData);
    },
  });

  // React Query - Update mutation
  const updateMutation = locationsApi.useUpdateLocation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setIsModalOpen(false);
      setFormData(initialFormData);
      setEditingId(null);
    },
  });

  // React Query - Delete mutation
  const deleteMutation = locationsApi.useDeleteLocation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setDeleteConfirm(null);
    },
  });

  // Form handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof FormData]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<FormData> = {};

    if (!formData.code.trim()) errors.code = "Code is required";
    if (!formData.province.trim()) errors.province = "Province is required";
    if (!formData.district.trim()) errors.district = "District is required";
    if (!formData.sub_district.trim()) errors.sub_district = "Sub-district is required";
    if (!formData.village.trim()) errors.village = "Village is required";
    if (!formData.approx_lat.trim()) {
      errors.approx_lat = "Latitude is required";
    } else if (isNaN(Number(formData.approx_lat))) {
      errors.approx_lat = "Latitude must be a number";
    }
    if (!formData.approx_long.trim()) {
      errors.approx_long = "Longitude is required";
    } else if (isNaN(Number(formData.approx_long))) {
      errors.approx_long = "Longitude must be a number";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = () => {
    setModalMode("create");
    setFormData(initialFormData);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleEdit = (location: Location) => {
    setModalMode("edit");
    setEditingId(location.id);
    setFormData({
      code: location.code,
      province: location.province,
      district: location.district,
      sub_district: location.sub_district,
      village: location.village,
      approx_lat: location.approx_lat.toString(),
      approx_long: location.approx_long.toString(),
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const locationData = {
      code: formData.code,
      province: formData.province,
      district: formData.district,
      sub_district: formData.sub_district,
      village: formData.village,
      approx_lat: parseFloat(formData.approx_lat),
      approx_long: parseFloat(formData.approx_long),
    };

    if (modalMode === "create") {
      createMutation.mutate(locationData as CreateLocation);
    } else if (editingId) {
      updateMutation.mutate({
        id: editingId,
        updatedLocation: locationData as UpdateLocation,
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <div className="flex items-center justify-between px-6 py-4 mb-6 border rounded-lg bg-light border-gray/30">
        <div className="space-y-1 text-gray">
          <div className="flex items-center gap-2">
            <h1 className="heading">Location Management</h1>
          </div>
          <p>Manage shipping locations and coordinates</p>
        </div>
      </div>

      <div className="p-4 mb-6 rounded-lg shadow bg-light">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search products..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              className="w-full px-3 py-2 border rounded-lg border-gray/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={handleSearch} className="btn-gray flex items-center gap-2">
              <FaSearch className="size-4" />
              Search
            </Button>

            <Button onClick={handleCreate} className="btn-blue">
              Add Location
            </Button>
          </div>
        </div>
      </div>

      <LocationLists currentPage={currentPage} handleEdit={handleEdit} locationsData={locationsData} handlePageChange={handlePageChange} isLoading={isLoading} setDeleteConfirm={setDeleteConfirm} />

      <Modal isVisible={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h4 className="mb-4 text-xl font-bold text-center sm:text-2xl sm:font-semibold md:text-3xl text-gray">{modalMode === "create" ? "Add New Location" : "Edit Location"}</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Code <span className="text-red-500">*</span>
            </label>
            <input type="text" name="code" value={formData.code} onChange={handleInputChange} className={`input-form ${formErrors.code ? "border-red-500" : "border-gray-300"}`} placeholder="0" />
            {formErrors.code && <p className="mt-1 text-sm text-red-500">{formErrors.code}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Province <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="province"
              value={formData.province}
              onChange={handleInputChange}
              className={`input-form ${formErrors.province ? "border-red-500" : "border-gray-300"}`}
              placeholder="DKI JAKARTA"
            />
            {formErrors.province && <p className="mt-1 text-sm text-red-500">{formErrors.province}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              District <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="district"
              value={formData.district}
              onChange={handleInputChange}
              className={`input-form ${formErrors.district ? "border-red-500" : "border-gray-300"}`}
              placeholder="JAKARTA PUSAT"
            />
            {formErrors.district && <p className="mt-1 text-sm text-red-500">{formErrors.district}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Sub-District <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="sub_district"
              value={formData.sub_district}
              onChange={handleInputChange}
              className={`input-form ${formErrors.sub_district ? "border-red-500" : "border-gray-300"}`}
              placeholder="GAMBIR"
            />
            {formErrors.sub_district && <p className="mt-1 text-sm text-red-500">{formErrors.sub_district}</p>}
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Village <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="village"
              value={formData.village}
              onChange={handleInputChange}
              className={`input-form ${formErrors.village ? "border-red-500" : "border-gray-300"}`}
              placeholder="GAMBIR"
            />
            {formErrors.village && <p className="mt-1 text-sm text-red-500">{formErrors.village}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Latitude <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="approx_lat"
              value={formData.approx_lat}
              onChange={handleInputChange}
              placeholder="-6.2088"
              className={`input-form ${formErrors.approx_lat ? "border-red-500" : "border-gray-300"}`}
            />
            {formErrors.approx_lat && <p className="mt-1 text-sm text-red-500">{formErrors.approx_lat}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Longitude <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="approx_long"
              value={formData.approx_long}
              onChange={handleInputChange}
              placeholder="106.8456"
              className={`input-form ${formErrors.approx_long ? "border-red-500" : "border-gray-300"}`}
            />
            {formErrors.approx_long && <p className="mt-1 text-sm text-red-500">{formErrors.approx_long}</p>}
          </div>
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <Button onClick={() => setIsModalOpen(false)} className="btn-outline">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="btn-blue">
            {isSubmitting && (
              <div className="flex justify-center items-center py-8">
                <div className="loader"></div>
              </div>
            )}
            {modalMode === "create" ? "Create Location" : "Update Location"}
          </Button>
        </div>
      </Modal>

      <Modal isVisible={deleteConfirm !== null} onClose={() => setDeleteConfirm(null)}>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Deletion</h3>
        <p className="text-gray-600 mb-6">Are you sure you want to delete this location? This action cannot be undone.</p>
        <div className="flex gap-3 justify-end">
          <Button onClick={() => setDeleteConfirm(null)} className="btn-outline">
            Cancel
          </Button>
          <Button onClick={() => handleDelete(deleteConfirm || "")} disabled={deleteMutation.isPending} className="btn-red">
            {deleteMutation.isPending && (
              <div className="flex justify-center items-center py-8">
                <div className="loader"></div>
              </div>
            )}
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
};
