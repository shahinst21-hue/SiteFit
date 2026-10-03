export const businessTypes = [
  {
    id: "coffee-shop",
    label: "Coffee Shop",
    category: "coffee-shop",
    description: "Coffee, conversation and a daily routine.",
  },
  {
    id: "restaurant",
    label: "Restaurant",
    category: "restaurant",
    description: "A place to eat, meet and come back to.",
  },
  {
    id: "hair-salon",
    label: "Hair Salon",
    category: "hair-beauty-salon",
    description: "Hair services and repeat appointments.",
  },
  {
    id: "beauty-salon",
    label: "Beauty Salon",
    category: "hair-beauty-salon",
    description: "Beauty treatments and personal care.",
  },
] as const;
export type BusinessType = (typeof businessTypes)[number]["id"];
export type BusinessCategory = (typeof businessTypes)[number]["category"];
export const steps = [
  "Property Address",
  "Business Type",
  "Business Economics",
  "Analysis",
] as const;

export const economicsFields = [
  {
    id: "annualRent",
    label: "Annual rent",
    unit: "£ / year",
    max: 100000000,
    integer: false,
  },
  {
    id: "businessRates",
    label: "Business rates",
    unit: "£ / year",
    max: 100000000,
    integer: false,
  },
  {
    id: "propertySize",
    label: "Property size",
    unit: "m²",
    max: 1000000,
    integer: false,
  },
  {
    id: "averageTransactionValue",
    label: "Average transaction value",
    unit: "£ / transaction",
    max: 1000000,
    integer: false,
  },
  {
    id: "grossMargin",
    label: "Gross margin",
    unit: "%",
    max: 100,
    integer: false,
  },
  {
    id: "staffCosts",
    label: "Staff costs",
    unit: "£ / year",
    max: 100000000,
    integer: false,
  },
  {
    id: "otherFixedCosts",
    label: "Other fixed costs",
    unit: "£ / year",
    max: 100000000,
    integer: false,
  },
  {
    id: "openingDays",
    label: "Opening days",
    unit: "days / week",
    max: 7,
    integer: true,
  },
  {
    id: "openingHours",
    label: "Opening hours",
    unit: "hours / day",
    max: 24,
    integer: false,
  },
  {
    id: "expectedInvestment",
    label: "Expected investment",
    unit: "£, one-off",
    max: 100000000,
    integer: false,
  },
] as const;
export type EconomicsKey = (typeof economicsFields)[number]["id"];
export type EconomicsDraft = Record<EconomicsKey, string>;
export type WizardDraft = {
  address: string;
  businessType: BusinessType | "";
  economics: EconomicsDraft;
};
export type FieldErrors = Partial<
  Record<EconomicsKey | "address" | "businessType", string>
>;
export type LocationCheckInput = {
  version: 1;
  address: { entered: string; resolution: "unresolved" };
  businessType: BusinessType;
  businessCategory: BusinessCategory;
  economics: Record<EconomicsKey, number | null>;
  currency: "GBP";
  units: {
    costs: "annual";
    size: "square-metres";
    openingDays: "per-week";
    openingHours: "per-day";
    investment: "one-off";
  };
};

export function emptyDraft(): WizardDraft {
  return {
    address: "",
    businessType: "",
    economics: Object.fromEntries(
      economicsFields.map((field) => [field.id, ""]),
    ) as EconomicsDraft,
  };
}

export function validateStep(step: number, draft: WizardDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (step === 0 || step === 3) {
    const address = draft.address.trim();
    if (!address) errors.address = "Enter the commercial property address.";
    else if (
      address.length < 8 ||
      address.length > 300 ||
      !/[a-z]/i.test(address) ||
      !/\d/.test(address)
    )
      errors.address =
        "Include a street address and postcode, using 8–300 characters.";
  }
  if (
    (step === 1 || step === 3) &&
    !businessTypes.some((type) => type.id === draft.businessType)
  )
    errors.businessType = "Choose the business you are considering.";
  if (step === 2 || step === 3) {
    for (const field of economicsFields) {
      const raw = draft.economics[field.id].trim();
      if (!raw) continue; // Unknown must remain distinct from zero.
      const value = Number(raw);
      if (
        !/^\d+(\.\d{1,2})?$/.test(raw) ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > field.max ||
        (field.integer && !Number.isInteger(value))
      ) {
        errors[field.id] =
          `Enter ${field.integer ? "a whole number" : "a number with up to 2 decimal places"} from 0 to ${field.max.toLocaleString("en-GB")}.`;
      }
    }
  }
  return errors;
}

export function nextStep(step: number, draft: WizardDraft) {
  return Object.keys(validateStep(step, draft)).length === 0
    ? Math.min(step + 1, 3)
    : step;
}

export function normaliseInput(draft: WizardDraft): LocationCheckInput {
  if (Object.keys(validateStep(3, draft)).length)
    throw new Error("Review your address, business type and optional costs.");
  const type = businessTypes.find((type) => type.id === draft.businessType)!;
  return {
    version: 1,
    address: { entered: draft.address.trim(), resolution: "unresolved" },
    businessType: type.id,
    businessCategory: type.category,
    economics: Object.fromEntries(
      economicsFields.map((field) => [
        field.id,
        draft.economics[field.id].trim() === ""
          ? null
          : Number(draft.economics[field.id]),
      ]),
    ) as LocationCheckInput["economics"],
    currency: "GBP",
    units: {
      costs: "annual",
      size: "square-metres",
      openingDays: "per-week",
      openingHours: "per-day",
      investment: "one-off",
    },
  };
}
