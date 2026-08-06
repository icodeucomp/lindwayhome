"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";

import { locationsApi } from "@/utils";

import { ApiResponse, CreateLocation, Location, UpdateLocation } from "@/types";

import { ErrorState, Field, FieldRow, FormActions, FormLayout, FormSection, LoadingState, PageHeader, TextInput } from "./slicing";

interface FormState {
  code: string;
  province: string;
  district: string;
  sub_district: string;
  village: string;
  approx_lat: string;
  approx_long: string;
}

const EMPTY: FormState = { code: "", province: "", district: "", sub_district: "", village: "", approx_lat: "", approx_long: "" };

const LIST_HREF = "/admin/dashboard/locations";

const validate = (form: FormState): Partial<FormState> => {
  const errors: Partial<FormState> = {};

  if (!form.code.trim()) errors.code = "Code is required";
  if (!form.province.trim()) errors.province = "Province is required";
  if (!form.district.trim()) errors.district = "District is required";
  if (!form.sub_district.trim()) errors.sub_district = "Sub-district is required";
  if (!form.village.trim()) errors.village = "Village is required";

  // Range-checked, not just parsed: a transposed lat/long still parses as a number
  // and would silently price every order to that village from the wrong hemisphere.
  const lat = Number(form.approx_lat);
  const long = Number(form.approx_long);

  if (!form.approx_lat.trim()) errors.approx_lat = "Latitude is required";
  else if (Number.isNaN(lat)) errors.approx_lat = "Latitude must be a number";
  else if (lat < -90 || lat > 90) errors.approx_lat = "Latitude must be between -90 and 90";

  if (!form.approx_long.trim()) errors.approx_long = "Longitude is required";
  else if (Number.isNaN(long)) errors.approx_long = "Longitude must be a number";
  else if (long < -180 || long > 180) errors.approx_long = "Longitude must be between -180 and 180";

  return errors;
};

export const LocationForm = ({ locationId }: { locationId?: string }) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const isEdit = Boolean(locationId);

  const { data, isLoading, isError } = locationsApi.useGetLocation<ApiResponse<Location>>({ key: ["location", locationId], id: locationId ?? "", enabled: isEdit });

  const [form, setForm] = React.useState<FormState>(EMPTY);
  const [errors, setErrors] = React.useState<Partial<FormState>>({});
  const [loadedId, setLoadedId] = React.useState<string | null>(null);

  // Seed the form the first time the record arrives, without an effect — an effect
  // here would clobber whatever the admin had already typed on every refetch.
  const record = data?.data;
  if (record && loadedId !== record.id) {
    setLoadedId(record.id);
    setForm({
      code: record.code,
      province: record.province,
      district: record.district,
      sub_district: record.sub_district,
      village: record.village,
      approx_lat: String(record.approx_lat),
      approx_long: String(record.approx_long),
    });
  }

  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["locations"] });
    router.push(LIST_HREF);
  };

  const createLocation = locationsApi.useCreateLocation({ onSuccess });
  const updateLocation = locationsApi.useUpdateLocation({ onSuccess });

  const isPending = createLocation.isPending || updateLocation.isPending;

  const setField = (key: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setForm((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => (previous[key] ? { ...previous, [key]: undefined } : previous));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const payload = {
      code: form.code.trim(),
      province: form.province.trim(),
      district: form.district.trim(),
      sub_district: form.sub_district.trim(),
      village: form.village.trim(),
      approx_lat: Number(form.approx_lat),
      approx_long: Number(form.approx_long),
    };

    if (isEdit && locationId) updateLocation.mutate({ id: locationId, updatedLocation: payload as UpdateLocation });
    else createLocation.mutate(payload as CreateLocation);
  };

  if (isEdit && isLoading) return <LoadingState message="Loading location" />;
  if (isEdit && isError) return <ErrorState message="We couldn't load this location." />;

  return (
    <>
      <PageHeader
        back={{ href: LIST_HREF, label: "Locations" }}
        title={isEdit ? "Edit location" : "New location"}
        description="Coordinates drive the shipping price. Take them from the village centre, not the province."
      />

      <FormLayout onSubmit={handleSubmit}>
        <FormSection title="Administrative area" description="All four levels are used by the cascading picker at checkout, so none of them is optional.">
          <Field label="Code" htmlFor="code" required error={errors.code} hint="The official area code — must be unique">
            <TextInput id="code" value={form.code} onChange={setField("code")} invalid={Boolean(errors.code)} placeholder="5171010001" />
          </Field>

          <FieldRow>
            <Field label="Province" htmlFor="province" required error={errors.province}>
              <TextInput id="province" value={form.province} onChange={setField("province")} invalid={Boolean(errors.province)} placeholder="BALI" />
            </Field>

            <Field label="District" htmlFor="district" required error={errors.district}>
              <TextInput id="district" value={form.district} onChange={setField("district")} invalid={Boolean(errors.district)} placeholder="DENPASAR" />
            </Field>
          </FieldRow>

          <FieldRow>
            <Field label="Sub-District" htmlFor="sub_district" required error={errors.sub_district}>
              <TextInput id="sub_district" value={form.sub_district} onChange={setField("sub_district")} invalid={Boolean(errors.sub_district)} placeholder="DENPASAR BARAT" />
            </Field>

            <Field label="Village" htmlFor="village" required error={errors.village}>
              <TextInput id="village" value={form.village} onChange={setField("village")} invalid={Boolean(errors.village)} placeholder="PEMECUTAN KLOD" />
            </Field>
          </FieldRow>
        </FormSection>

        <FormSection title="Coordinates" description="Decimal degrees. Bali sits near -8.65, 115.21 — a value far from that is usually a typo or a swapped pair.">
          <FieldRow>
            <Field label="Latitude" htmlFor="approx_lat" required error={errors.approx_lat} hint="-90 to 90">
              <TextInput id="approx_lat" inputMode="decimal" value={form.approx_lat} onChange={setField("approx_lat")} invalid={Boolean(errors.approx_lat)} placeholder="-8.6705" />
            </Field>

            <Field label="Longitude" htmlFor="approx_long" required error={errors.approx_long} hint="-180 to 180">
              <TextInput id="approx_long" inputMode="decimal" value={form.approx_long} onChange={setField("approx_long")} invalid={Boolean(errors.approx_long)} placeholder="115.2126" />
            </Field>
          </FieldRow>
        </FormSection>

        <FormActions isPending={isPending} submitLabel={isEdit ? "Save changes" : "Create location"} onCancel={() => router.push(LIST_HREF)} note="Coordinates are used by every shipping calculation." />
      </FormLayout>
    </>
  );
};
