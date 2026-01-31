import * as React from "react";

import { Button, NumberInput } from "@/components";

import { FaCreditCard } from "react-icons/fa";

import { formatIDR, guestCheckoutApi, locationsApi } from "@/utils";

import { CreateGuest, DiscountType, ConfigParameterData, CartItem, ApiResponse, Location } from "@/types";

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

const validateWhatsApp = (number: string): boolean => {
  const cleanNumber = number.replace(/\D/g, "");
  return cleanNumber.length >= 10 && cleanNumber.length <= 15;
};

const validatePostalCode = (code: number): boolean => {
  return code > 0 && code.toString().length >= 5;
};

const sanitizeInput = (value: string): string => {
  return value.trim().replace(/\s+/g, " ");
};

const validateField = (name: string, value: string | number): string => {
  switch (name) {
    case "email":
      const emailValue = typeof value === "string" ? value : "";
      if (!emailValue.trim()) return "Email is required";
      if (!validateEmail(emailValue)) return "Please enter a valid email address";
      return "";

    case "fullname":
      const nameValue = typeof value === "string" ? value : "";
      if (!nameValue.trim()) return "Full name is required";
      if (nameValue.trim().length < 2) return "Full name must be at least 2 characters";
      return "";

    case "whatsappNumber":
      const whatsappValue = typeof value === "string" ? value : "";
      if (!whatsappValue.trim()) return "WhatsApp number is required";
      if (!validateWhatsApp(whatsappValue)) return "Please enter a valid WhatsApp number (10-15 digits)";
      return "";

    case "address":
      const addressValue = typeof value === "string" ? value : "";
      if (!addressValue.trim()) return "Address is required";
      if (addressValue.trim().length < 10) return "Address must be at least 10 characters";
      return "";

    case "postalCode":
      const postalValue = typeof value === "number" ? value : parseInt(value as string) || 0;
      if (!postalValue) return "Postal code is required";
      if (!validatePostalCode(postalValue)) return "Please enter a valid postal code (at least 5 digits)";
      return "";

    default:
      return "";
  }
};

interface FormData extends Omit<CreateGuest, "purchased" | "totalItemsSold"> {
  isUploading: boolean;
  uploadProgress: number;
}

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
  formatted_cost: string;
}

interface CheckoutApiResponse {
  parameter: ConfigParameterData;
  shipping: ShippingCalculation;
  purchased: number;
  totalPurchased: number;
  isMember: boolean;
}

interface CheckoutFormProps {
  formData: FormData;
  formErrors: Record<string, string>;
  price: number;
  totalItem: number;
  cartItems: CartItem[];
  onSubmit: (data: FormData, errors: Record<string, string>) => void;
  onCancel: () => void;
  getSelectedTotal: () => number;
}

const locationData: LocationData = {
  province: "",
  district: "",
  sub_district: "",
  village: "",
};

export const CheckoutForm = ({ formData, formErrors, price, totalItem, cartItems, onSubmit, onCancel, getSelectedTotal }: CheckoutFormProps) => {
  const [currentFormData, setCurrentFormData] = React.useState<FormData>(formData);
  const [currentLocationData, setCurrentLocationData] = React.useState<LocationData>(locationData);
  const [currentFormErrors, setCurrentFormErrors] = React.useState(formErrors);

  const { province, district, sub_district, village } = currentLocationData;

  const isAddressComplete = Boolean(province?.trim() && district?.trim() && sub_district?.trim() && village?.trim());

  const {
    data: checkoutData,
    isLoading: isCheckoutLoading,
    isError: isCheckoutError,
  } = guestCheckoutApi.useGetGuestCheckouts<ApiResponse<CheckoutApiResponse>>({
    key: ["checkout", province, district, sub_district, village, cartItems, currentFormData.email],
    enabled: isAddressComplete,
    params: { province, district, sub_district, village, items: cartItems, email: currentFormData.email, purchased: getSelectedTotal() },
  });

  const { data: locationsData, isLoading } = locationsApi.useGetLocations<ApiResponse<Location[]>>({ key: ["locations"] });

  const provinceOptions = React.useMemo(() => {
    if (!locationsData?.data) return [];
    const uniqueProvinces = Array.from(new Set(locationsData.data.map((location) => location.province)))
      .sort()
      .map((province, index) => ({ key: `province-${index}`, value: province }));
    return uniqueProvinces;
  }, [locationsData]);

  const districtOptions = React.useMemo(() => {
    if (!locationsData?.data || !province) return [];
    const uniqueDistricts = Array.from(new Set(locationsData.data.filter((location) => location.province === province).map((location) => location.district)))
      .sort()
      .map((district, index) => ({ key: `district-${index}`, value: district }));
    return uniqueDistricts;
  }, [locationsData, province]);

  const subDistrictOptions = React.useMemo(() => {
    if (!locationsData?.data || !province || !district) return [];
    const uniqueSubDistricts = Array.from(new Set(locationsData.data.filter((location) => location.province === province && location.district === district).map((location) => location.sub_district)))
      .sort()
      .map((subDistrict, index) => ({ key: `sub-district-${index}`, value: subDistrict }));
    return uniqueSubDistricts;
  }, [locationsData, province, district]);

  const villageOptions = React.useMemo(() => {
    if (!locationsData?.data || !province || !district || !sub_district) return [];
    const uniqueVillages = Array.from(
      new Set(locationsData.data.filter((location) => location.province === province && location.district === district && location.sub_district === sub_district).map((location) => location.village)),
    )
      .sort()
      .map((village, index) => ({ key: `village-${index}`, value: village }));
    return uniqueVillages;
  }, [locationsData, province, district, sub_district]);

  const parameter = checkoutData?.data.parameter;
  const shippingData = checkoutData?.data.shipping;

  // Check if all required fields are filled
  const isRequiredFieldsFilled = React.useMemo(() => {
    return Boolean(
      currentFormData.email?.trim() &&
      currentFormData.fullname?.trim() &&
      currentFormData.whatsappNumber?.trim() &&
      currentFormData.address?.trim() &&
      currentFormData.postalCode &&
      province?.trim() &&
      district?.trim() &&
      sub_district?.trim() &&
      village?.trim(),
    );
  }, [currentFormData, province, district, sub_district, village]);

  const validateAllFields = (): boolean => {
    const errors: Record<string, string> = {};
    const requiredFields = ["email", "fullname", "whatsappNumber", "address", "postalCode"];

    requiredFields.forEach((field) => {
      const error = validateField(field, currentFormData[field as keyof typeof currentFormData] as string | number);
      if (error) {
        errors[field] = error;
      }
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

  const handleChangeOption = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;

    setCurrentLocationData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = (e: React.MouseEvent) => {
    e.preventDefault();

    if (!validateAllFields()) {
      return;
    }

    const sanitizedData = {
      ...currentFormData,
      email: currentFormData.email.trim(),
      fullname: sanitizeInput(currentFormData.fullname),
      whatsappNumber: currentFormData.whatsappNumber.trim(),
      address: sanitizeInput(currentFormData.address),
      shippingCost: shippingData ? shippingData.cost : 0,
      totalPurchased: checkoutData ? checkoutData.data.totalPurchased : 0,
      instagram: currentFormData.instagram ? sanitizeInput(currentFormData.instagram) : currentFormData.instagram,
      reference: currentFormData.reference ? sanitizeInput(currentFormData.reference) : currentFormData.reference,
    };

    onSubmit(sanitizedData, currentFormErrors);
  };

  const renderFieldText = (id: string, label: string, type: string = "text", placeholder: string = "", required: boolean = true, disabled: boolean = false) => (
    <div className="space-y-1">
      <label htmlFor={id} className="block mb-1 text-sm font-medium">
        {label} {required && "*"}
      </label>
      <input
        type={type}
        id={id}
        name={id}
        value={currentFormData[id as keyof typeof currentFormData] as string}
        onChange={handleChange}
        className={`input-form w-full ${currentFormErrors[id] ? "border-red-500" : "border-gray/30"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        placeholder={placeholder}
        disabled={disabled}
      />
      {currentFormErrors[id] && <p className="text-sm text-red-500">{currentFormErrors[id]}</p>}
    </div>
  );

  const renderFieldNumber = (id: string, label: string, placeholder: string = "", required: boolean = true, disabled: boolean = false) => (
    <div className="space-y-1">
      <label htmlFor={id} className="block mb-1 text-sm font-medium">
        {label} {required && "*"}
      </label>
      <NumberInput
        id={id}
        name={id}
        value={Number(currentFormData[id as keyof typeof currentFormData]) === 0 ? "" : Number(currentFormData[id as keyof typeof currentFormData])}
        onChange={handleChange}
        className={`input-form w-full ${currentFormErrors[id] ? "border-red-500" : "border-gray/30"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        placeholder={placeholder}
        disabled={disabled}
      />
      {currentFormErrors[id] && <p className="text-sm text-red-500">{currentFormErrors[id]}</p>}
    </div>
  );

  const renderFieldDropdown = (id: string, label: string, options: { key: string; value: string }[], placeholder: string = "Select an option", required: boolean = true, disabled: boolean = false) => (
    <div className="space-y-1">
      <label htmlFor={id} className="block mb-1 text-sm font-medium">
        {label} {required && "*"}
      </label>
      <select
        id={id}
        name={id}
        value={currentLocationData[id as keyof typeof currentLocationData] as string}
        onChange={handleChangeOption}
        className={`input-form w-full ${currentFormErrors[id] ? "border-red-500" : "border-gray/30"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.key} value={option.value}>
            {option.value}
          </option>
        ))}
      </select>
      {currentFormErrors[id] && <p className="text-sm text-red-500">{currentFormErrors[id]}</p>}
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <h2 className="text-xl font-bold sm:text-2xl text-gray">Checkout</h2>

      <div className="space-y-3 sm:space-y-4 text-gray">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <div>{renderFieldText("email", "Email Address", "email", "your@email.com")}</div>
          <div>{renderFieldText("fullname", "Full Name", "text", "John Doe")}</div>
          <div className="sm:col-span-2">{renderFieldText("whatsappNumber", "WhatsApp Number", "tel", "+62812345678")}</div>
          <div className="sm:col-span-2">{renderFieldText("address", "Address", "text", "Jalan Hayam Wuruk Gang XVII No. 36")}</div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="loader"></div>
            </div>
          ) : (
            <>
              <div>{renderFieldDropdown("province", "Province", provinceOptions, "Select Province")}</div>
              <div>{renderFieldDropdown("district", "District", districtOptions, "Select District", true, !province?.trim())}</div>
              <div>{renderFieldDropdown("sub_district", "Sub District", subDistrictOptions, "Select Sub District", true, !district?.trim())}</div>
              <div>{renderFieldDropdown("village", "Village", villageOptions, "Select Village", true, !sub_district?.trim())}</div>
            </>
          )}

          <div className="sm:col-span-2">{renderFieldNumber("postalCode", "Postal Code", "12345")}</div>
          <div>{renderFieldText("instagram", "Instagram", "text", "@yourusername", false)}</div>
          <div>{renderFieldText("reference", "How did you hear about us?", "text", "Instagram, friend, etc.", false)}</div>
        </div>
      </div>

      {/* Shipping Calculation Status - Always show when address is complete */}
      {isAddressComplete && isCheckoutLoading && (
        <div className="p-3 text-sm rounded-lg bg-gray/5 text-gray">
          <p className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-gray rounded-full animate-spin border-t-transparent"></span>
            Calculating shipping cost...
          </p>
        </div>
      )}

      {isAddressComplete && isCheckoutError && (
        <div className="p-3 text-sm rounded-lg bg-red-50 text-red-700">
          <p>Unable to calculate shipping. Please verify your address details.</p>
        </div>
      )}

      {/* Order Summary - Only show when all required fields are filled */}
      {isRequiredFieldsFilled && checkoutData && parameter && (
        <div className="p-3 mb-2 rounded-lg sm:p-4 bg-gray/5 text-gray">
          <h4 className="mb-3 text-sm font-semibold sm:text-base">Order Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>
                Subtotal ({totalItem} item{totalItem > 1 ? "s" : ""})
              </span>
              <span>{formatIDR(price)}</span>
            </div>

            <div className="flex items-center justify-between text-gray">
              <span>Shipping</span>
              {isCheckoutLoading ? (
                <span className="flex items-center gap-1 text-gray">
                  <span className="inline-block w-3 h-3 border-2 border-gray rounded-full animate-spin border-t-transparent"></span>
                  Calculating...
                </span>
              ) : isCheckoutError ? (
                <span className="text-red-500">Error</span>
              ) : (
                <span className={shippingData?.cost === 0 ? "text-green-600" : "text-red-500"}>{shippingData?.cost === 0 ? "Free" : `+${formatIDR(shippingData?.cost || 0)}`}</span>
              )}
            </div>

            {shippingData && !isCheckoutLoading && !isCheckoutError && (
              <div className="pl-4 space-y-1 text-xs text-gray/70">
                <p>
                  Zone: {shippingData.zone} • Distance: {shippingData.distance_km.toFixed(2)} km
                </p>
                <p>Weight: {shippingData.weight_kg} kg</p>
              </div>
            )}

            <div className="flex items-center justify-between text-gray">
              <span>Tax</span>
              <span className={Number(parameter.tax_rate) === 0 ? "text-green-600" : "text-red-500"}>
                {Number(parameter.tax_rate) === 0 ? "Free" : parameter.tax_type === DiscountType.FIXED ? `+${formatIDR(Number(parameter.tax_rate))}` : `+${Number(parameter.tax_rate)}%`}
              </span>
            </div>

            <div className="flex items-center justify-between text-gray">
              <span>Promo</span>
              <span className="text-green-600">
                {parameter.promo_type === DiscountType.FIXED ? `-${formatIDR(Number(parameter.promotion_discount))}` : `-${Number(parameter.promotion_discount)}%`}
              </span>
            </div>

            {checkoutData.data.isMember && (
              <div className="flex items-center justify-between text-gray">
                <span>Member Discount</span>
                <span className="text-green-600">{parameter.member_type === DiscountType.FIXED ? `-${formatIDR(Number(parameter.member_discount))}` : `-${Number(parameter.member_discount)}%`}</span>
              </div>
            )}

            <div className="pt-2 mt-2 border-t">
              <div className="flex justify-between text-base font-bold sm:text-lg">
                <span>Total</span>
                <span>{formatIDR(checkoutData.data.totalPurchased)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse items-center w-full gap-2 sm:flex-row sm:gap-4">
        <Button type="button" onClick={onCancel} className="w-full btn-outline">
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleFormSubmit}
          className="flex items-center justify-center w-full gap-2 btn-gray"
          disabled={!checkoutData || isCheckoutLoading || (isAddressComplete && isCheckoutError)}
        >
          <FaCreditCard size={18} />
          Next
        </Button>
      </div>

      <div className="mt-4 text-center">
        <p className="text-xs text-darker-gray">🔒 Secure checkout process</p>
      </div>
    </div>
  );
};
