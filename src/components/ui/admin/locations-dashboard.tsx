"use client";

import * as React from "react";

import { useSearchPagination } from "@/hooks";

import { useQueryClient } from "@tanstack/react-query";

import { ConfirmDialog, Field, LocationLists, SearchInput, Spinner, Toolbar } from "./slicing";

import { Button, Modal } from "@/components";

import { FaPlus, FaSearch } from "react-icons/fa";

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

  const { searchQuery, inputValue, setInputValue, handleSearch, handleClearSearch, currentPage, handlePageChange } = useSearchPagination({
    defaultPage: 1,
    searchParamName: "search",
    pageParamName: "page",
  });

  const [itemsPerPage] = React.useState(10);

  // Modal state
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [modalMode, setModalMode] = React.useState<"create" | "edit">("create");
  const [formData, setFormData] = React.useState<FormData>(initialFormData);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [formErrors, setFormErrors] = React.useState<Partial<FormData>>({});
  const [deleteConfirm, setDeleteConfirm] = React.useState<Location | null>(null);

  const {
    data: locationsData,
    isLoading,
    isError,
  } = locationsApi.useGetLocations<ApiResponse<Location[]>>({
    key: ["locations", currentPage, searchQuery],
    params: {
      page: currentPage,
      limit: itemsPerPage,
      search: searchQuery,
    },
  });

  const createMutation = locationsApi.useCreateLocation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setIsModalOpen(false);
      setFormData(initialFormData);
    },
  });

  const updateMutation = locationsApi.useUpdateLocation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setIsModalOpen(false);
      setFormData(initialFormData);
      setEditingId(null);
    },
  });

  const deleteMutation = locationsApi.useDeleteLocation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setDeleteConfirm(null);
    },
  });

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

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

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

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Toolbar>
        <SearchInput value={inputValue} onChange={setInputValue} onSearch={handleSearch} onClear={handleClearSearch} placeholder="Search by code, province, district or village..." />

        <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
          <Button onClick={handleSearch} className="flex items-center justify-center gap-2 btn-gray">
            <FaSearch className="size-4" />
            Search
          </Button>

          <Button onClick={handleCreate} className="flex items-center justify-center gap-2 btn-blue whitespace-nowrap">
            <FaPlus className="size-3.5" />
            Add Location
          </Button>
        </div>
      </Toolbar>

      <LocationLists
        currentPage={currentPage}
        handleEdit={handleEdit}
        locationsData={locationsData}
        handlePageChange={handlePageChange}
        isLoading={isLoading}
        isError={isError}
        hasFilters={!!searchQuery}
        setDeleteConfirm={setDeleteConfirm}
      />

      <Modal isVisible={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="pr-10 mb-6 space-y-1">
          <h3 className="text-2xl font-bold text-darker-gray">{modalMode === "create" ? "Add New Location" : "Edit Location"}</h3>
          <p className="text-sm text-gray/70">Shipping cost is calculated from these coordinates, so double-check them before saving.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Code" htmlFor="code" required error={formErrors.code}>
              <input type="text" id="code" name="code" value={formData.code} onChange={handleInputChange} className={`input-form ${formErrors.code ? "border-red-500" : ""}`} placeholder="0" />
            </Field>

            <Field label="Province" htmlFor="province" required error={formErrors.province}>
              <input
                type="text"
                id="province"
                name="province"
                value={formData.province}
                onChange={handleInputChange}
                className={`input-form ${formErrors.province ? "border-red-500" : ""}`}
                placeholder="DKI JAKARTA"
              />
            </Field>

            <Field label="District" htmlFor="district" required error={formErrors.district}>
              <input
                type="text"
                id="district"
                name="district"
                value={formData.district}
                onChange={handleInputChange}
                className={`input-form ${formErrors.district ? "border-red-500" : ""}`}
                placeholder="JAKARTA PUSAT"
              />
            </Field>

            <Field label="Sub-District" htmlFor="sub_district" required error={formErrors.sub_district}>
              <input
                type="text"
                id="sub_district"
                name="sub_district"
                value={formData.sub_district}
                onChange={handleInputChange}
                className={`input-form ${formErrors.sub_district ? "border-red-500" : ""}`}
                placeholder="GAMBIR"
              />
            </Field>

            <Field label="Village" htmlFor="village" required error={formErrors.village} className="md:col-span-2">
              <input
                type="text"
                id="village"
                name="village"
                value={formData.village}
                onChange={handleInputChange}
                className={`input-form ${formErrors.village ? "border-red-500" : ""}`}
                placeholder="GAMBIR"
              />
            </Field>

            <Field label="Latitude" htmlFor="approx_lat" required error={formErrors.approx_lat} hint="Decimal degrees, e.g. -6.2088">
              <input
                type="text"
                id="approx_lat"
                name="approx_lat"
                value={formData.approx_lat}
                onChange={handleInputChange}
                placeholder="-6.2088"
                className={`input-form ${formErrors.approx_lat ? "border-red-500" : ""}`}
              />
            </Field>

            <Field label="Longitude" htmlFor="approx_long" required error={formErrors.approx_long} hint="Decimal degrees, e.g. 106.8456">
              <input
                type="text"
                id="approx_long"
                name="approx_long"
                value={formData.approx_long}
                onChange={handleInputChange}
                placeholder="106.8456"
                className={`input-form ${formErrors.approx_long ? "border-red-500" : ""}`}
              />
            </Field>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-4 border-t sm:flex-row sm:justify-end border-gray/10">
            <Button type="button" onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="btn-outline">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex items-center justify-center gap-2 btn-blue">
              {isSubmitting && <Spinner />}
              {isSubmitting ? "Saving..." : modalMode === "create" ? "Create Location" : "Update Location"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isVisible={deleteConfirm !== null}
        title="Delete this location?"
        description={`"${deleteConfirm?.village}, ${deleteConfirm?.district}" will be permanently removed. This action cannot be undone.`}
        confirmLabel="Delete Location"
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
        onClose={() => setDeleteConfirm(null)}
      />
    </>
  );
};
