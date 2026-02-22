const validateEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const validateWhatsApp = (number: string): boolean => {
  const clean = number.replace(/\D/g, "");
  return clean.length >= 10 && clean.length <= 15;
};

const validatePostalCode = (code: number): boolean => code > 0 && code.toString().length >= 5;

export const sanitizeInput = (value: string): string => value.trim().replace(/\s+/g, " ");

export const validateField = (name: string, value: string | number): string => {
  switch (name) {
    case "email": {
      const v = typeof value === "string" ? value : "";
      if (!v.trim()) return "Email is required";
      if (!validateEmail(v)) return "Please enter a valid email address";
      return "";
    }
    case "fullname": {
      const v = typeof value === "string" ? value : "";
      if (!v.trim()) return "Full name is required";
      if (v.trim().length < 2) return "Full name must be at least 2 characters";
      return "";
    }
    case "whatsappNumber": {
      const v = typeof value === "string" ? value : "";
      if (!v.trim()) return "WhatsApp number is required";
      if (!validateWhatsApp(v)) return "Please enter a valid WhatsApp number (10-15 digits)";
      return "";
    }
    case "address": {
      const v = typeof value === "string" ? value : "";
      if (!v.trim()) return "Address is required";
      if (v.trim().length < 10) return "Address must be at least 10 characters";
      return "";
    }
    case "postalCode": {
      const v = typeof value === "number" ? value : parseInt(value as string) || 0;
      if (!v) return "Postal code is required";
      if (!validatePostalCode(v)) return "Please enter a valid postal code (at least 5 digits)";
      return "";
    }
    default:
      return "";
  }
};
