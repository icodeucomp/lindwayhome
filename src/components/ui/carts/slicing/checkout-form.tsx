"use client";

import * as React from "react";

import { NumberInput } from "@/components";

import { StoreButton } from "@/components/ui/storefront";

import { PiLockSimple } from "react-icons/pi";

import Select from "react-select";

import { formatIDR, orderCheckoutApi, locationsApi, sanitizeInput, validateField } from "@/utils";

import { CheckoutFormData, DiscountType, ConfigParameterData, CartItem, ApiResponse, SelectOption } from "@/types";


interface LocationData {
  province: string;
  district: string;
  sub_district: string;
  village: string;
}

interface ShippingCalculation {
  cost: number;
  zone: string;
  distance_km: number;
  weight_kg: number;
}

interface CheckoutApiResponse {
  parameter: ConfigParameterData;
  shipping: ShippingCalculation;
  totalPurchased: number;
  isMember: boolean;
  checkoutToken: string;
}

interface CheckoutFormProps {
  formData: CheckoutFormData;
  formErrors: Record<string, string>;
  price: number;
  totalItem: number;
  cartItems: CartItem[];
  onSubmit: (data: CheckoutFormData, errors: Record<string, string>) => void;
  onCancel: () => void;
}

const initialLocationData: LocationData = {
  province: "",
  district: "",
  sub_district: "",
  village: "",
};

export const CheckoutForm = ({ formData, formErrors, price, totalItem, cartItems, onSubmit, onCancel }: CheckoutFormProps) => {
  const [currentFormData, setCurrentFormData] = React.useState<CheckoutFormData>(formData);
  const [currentLocationData, setCurrentLocationData] = React.useState<LocationData>(initialLocationData);
  const [currentFormErrors, setCurrentFormErrors] = React.useState(formErrors);

  const { province, district, sub_district, village } = currentLocationData;

  const isAddressComplete = Boolean(province?.trim() && district?.trim() && sub_district?.trim() && village?.trim());

  const {
    data: checkoutData,
    isLoading: isCheckoutLoading,
    isError: isCheckoutError,
  } = orderCheckoutApi.useGetOrderCheckout<ApiResponse<CheckoutApiResponse>>({
    key: ["checkout", province, district, sub_district, village, cartItems, currentFormData.email],
    enabled: isAddressComplete,
    params: {
      province,
      district,
      sub_district,
      village,
      items: cartItems,
      email: currentFormData.email,
    },
  });

  const { data: provincesData, isLoading: isLoadingProvinces } = locationsApi.useGetMappingLocations<ApiResponse<SelectOption[]>>({
    key: ["locations", "provinces"],
    params: { type: "provinces" },
  });

  const { data: districtsData, isLoading: isLoadingDistricts } = locationsApi.useGetMappingLocations<ApiResponse<SelectOption[]>>({
    key: ["locations", "districts", province],
    enabled: !!province,
    params: { type: "districts", province },
  });

  const { data: subDistrictsData, isLoading: isLoadingSubDistricts } = locationsApi.useGetMappingLocations<ApiResponse<SelectOption[]>>({
    key: ["locations", "sub_districts", province, district],
    enabled: !!province && !!district,
    params: { type: "sub_districts", province, district },
  });

  const { data: villagesData, isLoading: isLoadingVillages } = locationsApi.useGetMappingLocations<ApiResponse<SelectOption[]>>({
    key: ["locations", "villages", province, district, sub_district],
    enabled: !!province && !!district && !!sub_district,
    params: { type: "villages", province, district, sub_district },
  });

  const provinceOptions = provincesData?.data || [];
  const districtOptions = districtsData?.data || [];
  const subDistrictOptions = subDistrictsData?.data || [];
  const villageOptions = villagesData?.data || [];

  const parameter = checkoutData?.data.parameter;
  const shippingData = checkoutData?.data.shipping;

  const isRequiredFieldsFilled = React.useMemo(
    () =>
      Boolean(
        currentFormData.email?.trim() &&
        currentFormData.fullname?.trim() &&
        currentFormData.whatsappNumber?.trim() &&
        currentFormData.address?.trim() &&
        currentFormData.postalCode &&
        province?.trim() &&
        district?.trim() &&
        sub_district?.trim() &&
        village?.trim(),
      ),
    [currentFormData, province, district, sub_district, village],
  );

  const canSubmit = !!checkoutData?.data.checkoutToken && !isCheckoutLoading && !(isAddressComplete && isCheckoutError);

  const validateAllFields = (): boolean => {
    const errors: Record<string, string> = {};
    const requiredFields = ["email", "fullname", "whatsappNumber", "address", "postalCode"];

    requiredFields.forEach((field) => {
      const error = validateField(field, currentFormData[field as keyof typeof currentFormData] as string | number);
      if (error) errors[field] = error;
    });

    if (isAddressComplete && isCheckoutLoading) {
      errors.address = "Please wait for shipping calculation to complete";
    }

    if (isAddressComplete && isCheckoutError) {
      errors.address = "Unable to calculate shipping. Please check your address details.";
    }

    setCurrentFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;

    let processedValue: string | number;

    if (type === "number") {
      processedValue = value === "" ? "" : Number(value);
    } else if (name === "whatsappNumber") {
      processedValue = value.replace(/[^\d+\-\s()]/g, "");
    } else {
      processedValue = value;
    }

    setCurrentFormData((prev) => ({ ...prev, [name]: processedValue }));

    if (currentFormErrors[name]) {
      setCurrentFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleChangeOption = (selectedOption: SelectOption | null, name: string) => {
    const value = selectedOption ? selectedOption.value : "";

    setCurrentLocationData((prev) => {
      const updated = { ...prev, [name]: value };

      if (name === "province") {
        updated.district = "";
        updated.sub_district = "";
        updated.village = "";
      } else if (name === "district") {
        updated.sub_district = "";
        updated.village = "";
      } else if (name === "sub_district") {
        updated.village = "";
      }

      return updated;
    });
  };

  const handleFormSubmit = (e: React.MouseEvent) => {
    e.preventDefault();

    if (!validateAllFields()) return;

    if (!checkoutData) return;

    const sanitizedData = {
      ...currentFormData,
      email: currentFormData.email.trim(),
      fullname: sanitizeInput(currentFormData.fullname),
      whatsappNumber: currentFormData.whatsappNumber.trim(),
      address: sanitizeInput(currentFormData.address),
      instagram: currentFormData.instagram ? sanitizeInput(currentFormData.instagram) : currentFormData.instagram,
      reference: currentFormData.reference ? sanitizeInput(currentFormData.reference) : currentFormData.reference,
      totalPurchased: checkoutData?.data.totalPurchased || 0,
      isMember: checkoutData?.data.isMember || false,
      checkoutToken: checkoutData?.data.checkoutToken,
    };

    onSubmit(sanitizedData, currentFormErrors);
  };

  const Label = ({ id, label, required }: { id: string; label: string; required: boolean }) => (
    <label htmlFor={id} className="mb-1.5 block font-heading text-xxs uppercase tracking-[0.16em] text-body/55">
      {label}
      {required && <span className="text-primary"> *</span>}
    </label>
  );

  const renderFieldText = (id: string, label: string, type: string = "text", placeholder: string = "", required: boolean = true, disabled: boolean = false) => (
    <div className="space-y-1">
      <Label id={id} label={label} required={required} />
      <input
        type={type}
        id={id}
        name={id}
        value={currentFormData[id as keyof typeof currentFormData] as string}
        onChange={handleChange}
        className={`input-form w-full ${currentFormErrors[id] ? "border-primary" : ""} ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
        placeholder={placeholder}
        disabled={disabled}
      />
      {currentFormErrors[id] && <p className="mt-1.5 text-xs text-primary">{currentFormErrors[id]}</p>}
    </div>
  );

  const renderFieldNumber = (id: string, label: string, placeholder: string = "", required: boolean = true, disabled: boolean = false) => (
    <div className="space-y-1">
      <Label id={id} label={label} required={required} />
      <NumberInput
        id={id}
        name={id}
        value={Number(currentFormData[id as keyof typeof currentFormData]) === 0 ? "" : Number(currentFormData[id as keyof typeof currentFormData])}
        onChange={handleChange}
        className={`input-form w-full ${currentFormErrors[id] ? "border-primary" : ""} ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
        placeholder={placeholder}
        disabled={disabled}
      />
      {currentFormErrors[id] && <p className="mt-1.5 text-xs text-primary">{currentFormErrors[id]}</p>}
    </div>
  );

  const renderFieldSelect = (
    id: string,
    label: string,
    options: SelectOption[],
    placeholder: string = "Select an option",
    required: boolean = true,
    disabled: boolean = false,
    isLoading: boolean = false,
  ) => {
    const selectedValue = currentLocationData[id as keyof typeof currentLocationData];
    const selectedOption = options.find((opt) => opt.value === selectedValue) || null;

    return (
      <div className="space-y-1">
        <label htmlFor={id} className="block mb-1 text-sm font-medium">
          {label} {required && "*"}
        </label>
        <Select
          id={id}
          name={id}
          value={selectedOption}
          onChange={(option) => handleChangeOption(option, id)}
          options={options}
          placeholder={placeholder}
          isDisabled={disabled}
          isLoading={isLoading}
          isClearable
          isSearchable
          classNamePrefix="react-select"
          className="react-select-container"
          noOptionsMessage={() => "No options available"}
        />
        {currentFormErrors[id] && <p className="mt-1.5 text-xs text-primary">{currentFormErrors[id]}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <h2 className="text-xl uppercase font-heading text-primary tracking-[0.06em]">Delivery Details</h2>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <div>{renderFieldText("email", "Email Address", "email", "your@email.com")}</div>
          <div>{renderFieldText("fullname", "Full Name", "text", "John Doe")}</div>
          <div className="sm:col-span-2">{renderFieldText("whatsappNumber", "WhatsApp Number", "tel", "+62812345678")}</div>
          <div className="sm:col-span-2">{renderFieldText("address", "Address", "text", "Jalan Hayam Wuruk Gang XVII No. 36")}</div>

          <div>{renderFieldSelect("province", "Province", provinceOptions, "Select Province", true, false, isLoadingProvinces)}</div>
          <div>{renderFieldSelect("district", "District", districtOptions, "Select District", true, !province?.trim(), isLoadingDistricts)}</div>
          <div>{renderFieldSelect("sub_district", "Sub District", subDistrictOptions, "Select Sub District", true, !district?.trim(), isLoadingSubDistricts)}</div>
          <div>{renderFieldSelect("village", "Village", villageOptions, "Select Village", true, !sub_district?.trim(), isLoadingVillages)}</div>

          <div className="sm:col-span-2">{renderFieldNumber("postalCode", "Postal Code", "12345")}</div>
          <div>{renderFieldText("instagram", "Instagram", "text", "@yourusername", false)}</div>
          <div>{renderFieldText("reference", "How did you hear about us?", "text", "Instagram, friend, etc.", false)}</div>
        </div>
      </div>

      {isAddressComplete && isCheckoutLoading && (
        <p className="flex items-center gap-2 px-4 py-3 text-xs border border-border bg-muted text-body/70">
          <span className="inline-block border-2 rounded-full size-3 animate-spin border-primary border-t-transparent" />
          Calculating shipping…
        </p>
      )}

      {isAddressComplete && isCheckoutError && (
        <p className="px-4 py-3 text-xs border border-primary/40 bg-primary/5 text-primary">Unable to calculate shipping — please check the address above.</p>
      )}

      {isRequiredFieldsFilled && checkoutData && parameter && (
        <div className="p-5 space-y-3 border border-border bg-muted">
          <p className="font-heading text-xxs uppercase tracking-[0.16em] text-body/55">Order Summary</p>
          <div className="space-y-2 text-sm text-body">
            <div className="flex justify-between">
              <span>
                Subtotal ({totalItem} item{totalItem > 1 ? "s" : ""})
              </span>
              <span>{formatIDR(price)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span>Shipping</span>
              {isCheckoutLoading ? (
                <span className="flex items-center gap-1 text-body/60">
                  <span className="inline-block border-2 rounded-full size-3 animate-spin border-primary border-t-transparent" />
                  Calculating...
                </span>
              ) : isCheckoutError ? (
                <span className="text-primary">Unavailable</span>
              ) : (
                <span>{shippingData?.cost === 0 ? "Free" : `+${formatIDR(shippingData?.cost || 0)}`}</span>
              )}
            </div>

            {shippingData && !isCheckoutLoading && !isCheckoutError && (
              <div className="pl-4 space-y-1 text-xs text-body/55">
                <p>
                  Zone: {shippingData.zone} • Distance: {shippingData.distance_km.toFixed(2)} km
                </p>
                <p>Weight: {shippingData.weight_kg} kg</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span>Tax</span>
              <span>
                {Number(parameter.tax_rate) === 0 ? "Free" : parameter.tax_type === DiscountType.FIXED ? `+${formatIDR(Number(parameter.tax_rate))}` : `+${Number(parameter.tax_rate)}%`}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span>Promo</span>
              <span>
                {parameter.promo_type === DiscountType.FIXED ? `-${formatIDR(Number(parameter.promotion_discount))}` : `-${Number(parameter.promotion_discount)}%`}
              </span>
            </div>

            {checkoutData.data.isMember && (
              <div className="flex items-center justify-between">
                <span>Member Discount</span>
                <span>{parameter.member_type === DiscountType.FIXED ? `-${formatIDR(Number(parameter.member_discount))}` : `-${Number(parameter.member_discount)}%`}</span>
              </div>
            )}

            <div className="pt-3 mt-3 border-t border-border">
              <div className="flex justify-between text-lg font-heading">
                <span>Total</span>
                <span>{formatIDR(checkoutData.data.totalPurchased)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <StoreButton type="button" variant="outline" onClick={onCancel} className="w-full">
          Cancel
        </StoreButton>
        <StoreButton type="button" onClick={handleFormSubmit} disabled={!canSubmit} className="w-full">
          Continue to Payment
        </StoreButton>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-xxs text-body/50">
        <PiLockSimple className="size-3" />
        Prices are re-checked on our server before your order is created.
      </p>
    </div>
  );
};
