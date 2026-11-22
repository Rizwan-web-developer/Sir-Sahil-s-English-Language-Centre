import type { UserRole } from "@/types/domain";

export const APP_NAME = "Sir Sahil's English Language Centre";
export const APP_SHORT_NAME = "SELC";

export const INSTITUTE = {
  name: APP_NAME,
  shortName: APP_SHORT_NAME,
  timezone: "Asia/Karachi",
  currency: "PKR",
  weekStartsOn: 1, // Monday
  classDayStart: "14:00",
  classDayEnd: "22:00",
  defaultAttendanceThreshold: 75,
  defaultMinAssignmentAverage: 50,
  defaultFeeDueDay: 10,
} as const;

/** Where each role lands after login. */
export const ROLE_HOME: Record<UserRole, string> = {
  owner: "/owner",
  reception: "/admin",
  student: "/portal",
};

/** Prefixes each role is allowed to open. Used by proxy + layouts. */
export const AREA_ROLES: Record<string, UserRole[]> = {
  "/admin": ["reception"],
  "/owner": ["owner"],
  "/portal": ["student"],
};

export const ERROR_CODES = {
  inactive: "Your account is inactive. Please contact the institute.",
  invalidCredentials: "Invalid login details. Please try again.",
  missingProfile: "Your account is not linked to a profile yet.",
  generic: "Something went wrong. Please try again.",
} as const;

/** Default values seeded into the settings table. */
export const DEFAULT_SETTINGS = {
  institute_name: APP_NAME,
  institute_short_name: APP_SHORT_NAME,
  institute_address: "",
  institute_phone: "",
  institute_logo_url: "",
  receipt_footer: "Thank you for your payment.",
  attendance_threshold: 75,
  min_assignment_average: 50,
  fee_due_day: 10,
  currency: "PKR",
  timezone: "Asia/Karachi",
} as const;
