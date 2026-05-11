import type { UserCompliancePreferences } from "@/types/client";

export type ComplianceRequirementKey =
  | "homeowners_cert"
  | "barangay_cert"
  | "barangay_permit"
  | "electrical_permit"
  | "net_metering"
  | "solar_diagram";

export interface ComplianceTemplateDef {
  key: ComplianceRequirementKey;
  title: string;
  description: string;
  /** Calendar days after project start date */
  daysFromStart: number;
  sortOrder: number;
  isOptional: boolean;
  subdivisionOnly: boolean;
  netMeteringOnly: boolean;
  suppliedBy: "client" | "admin";
}

/** Workflow order / display order (`sort_order`); homeowners first only when subdivision. */
export const COMPLIANCE_TEMPLATE: ComplianceTemplateDef[] = [
  {
    key: "homeowners_cert",
    title: "Homeowners certificate",
    description:
      "Optional for clients in subdivisions: HOA or homeowners association certificate when required by your community.",
    daysFromStart: 7,
    sortOrder: 10,
    isOptional: true,
    subdivisionOnly: true,
    netMeteringOnly: false,
    suppliedBy: "client",
  },
  {
    key: "barangay_cert",
    title: "Barangay certificate",
    description: "Barangay clearance or certification for your installation address.",
    daysFromStart: 14,
    sortOrder: 20,
    isOptional: false,
    subdivisionOnly: false,
    netMeteringOnly: false,
    suppliedBy: "client",
  },
  {
    key: "barangay_permit",
    title: "Barangay permit",
    description: "Local barangay building or ancillary permit as required for solar works.",
    daysFromStart: 21,
    sortOrder: 30,
    isOptional: false,
    subdivisionOnly: false,
    netMeteringOnly: false,
    suppliedBy: "client",
  },
  {
    key: "solar_diagram",
    title: "Solar single-line / layout diagram",
    description: "Engineering diagram for your system. GreenSky Solar will attach this when ready.",
    daysFromStart: 24,
    sortOrder: 35,
    isOptional: false,
    subdivisionOnly: false,
    netMeteringOnly: false,
    suppliedBy: "admin",
  },
  {
    key: "net_metering",
    title: "Net metering application",
    description:
      "Optional: application and supporting documents if you plan to export excess energy (e.g. with Meralco net metering).",
    daysFromStart: 28,
    sortOrder: 40,
    isOptional: true,
    subdivisionOnly: false,
    netMeteringOnly: true,
    suppliedBy: "client",
  },
  {
    key: "electrical_permit",
    title: "Electrical permit",
    description: "Electrical permit or related authorization from the proper office.",
    daysFromStart: 35,
    sortOrder: 50,
    isOptional: false,
    subdivisionOnly: false,
    netMeteringOnly: false,
    suppliedBy: "client",
  },
];

export function complianceRowApplies(
  def: ComplianceTemplateDef,
  prefs: UserCompliancePreferences
): boolean {
  if (def.subdivisionOnly && !prefs.inSubdivision) return false;
  if (def.netMeteringOnly && !prefs.wantsNetMetering) return false;
  return true;
}
