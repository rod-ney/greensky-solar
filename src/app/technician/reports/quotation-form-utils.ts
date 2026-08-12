export const STANDARD_QUOTATION_TERMS = [
  "Spare parts sourcing will start once the client approves and deposited the DP.",
  "Servicing will start once the spare parts and materials are completed.",
  "This service report & quote is VAT exclusive and valid for 15 days only.",
  "Looking forward for your business",
  "Terms and Condition",
  "1. Warranty: 3 months and applies to replaced parts and materials only.",
  "2. Quoted price is subject to change without notice and valid for 15 days only.",
  "3. Hidden or defective parts/materials are not covered in the quotation.",
  "4. Non-refundable down payment: Down payment are not refundable.",
];

export function buildQuotationTerms(dpPercent: number, customTerms?: string[]) {
  if (customTerms && customTerms.some((term) => term.trim())) {
    return customTerms.filter((term) => term.trim());
  }

  return [
    `DP or Down Payment is ${Number.isFinite(dpPercent) ? dpPercent : 50}% of the Total cost.`,
    ...STANDARD_QUOTATION_TERMS.slice(1),
  ];
}

export function calculateMaterialLineTotal(quantity: number, amount: number) {
  return Number((Number(quantity || 0) * Number(amount || 0)).toFixed(2));
}

export function getQuotationMaterialValidationErrors(rows: Array<{ description: string; qty: number; amt: number; total: number }>) {
  return rows
    .map((row, index) => {
      const errors: string[] = [];

      if (!row.description.trim()) {
        errors.push("Select a material");
      }

      if ((row.qty || 0) < 1) {
        errors.push("Quantity must be at least 1");
      }

      if ((row.amt || 0) < 0) {
        errors.push("Amount cannot be negative");
      }

      if (Math.abs((row.total || 0) - calculateMaterialLineTotal(row.qty, row.amt)) > 0.01) {
        errors.push("Total does not match quantity × amount");
      }

      return { index, errors };
    })
    .filter((row) => row.errors.length > 0);
}
