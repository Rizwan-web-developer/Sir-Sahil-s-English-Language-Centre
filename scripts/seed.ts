import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Copy .env.example to .env.local and fill in your Supabase project values.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const RESET = process.argv.includes("--reset");

type SeedUser = {
  email: string;
  password: string;
  fullName: string;
  role: "owner" | "reception" | "student";
  defaultPanel?: "teacher" | "management";
  phone?: string;
};

const STAFF_USERS: SeedUser[] = [
  {
    email: "teacher@gmail.com",
    password: "teacher@123",
    fullName: "Sir Sahil",
    role: "owner",
    defaultPanel: "teacher",
    phone: "",
  },
  {
    email: "owner@gmail.com",
    password: "owner@123",
    fullName: "Management",
    role: "reception",
    defaultPanel: "management",
    phone: "",
  },
];

const STUDENT_PASSWORD = "Student@12345";

const DEMO_STUDENTS = [
  { code: "SELC-0001", full_name: "Ahmed Ali", phone: "03110000001", father_name: "Muhammad Ali", monthly_fee: 8000 },
  { code: "SELC-0002", full_name: "Fatima Noor", phone: "03110000002", father_name: "Noor Ahmed", monthly_fee: 8000 },
  { code: "SELC-0003", full_name: "Hassan Raza", phone: "03110000003", father_name: "Raza Khan", monthly_fee: 7500 },
  { code: "SELC-0004", full_name: "Ayesha Khan", phone: "03110000004", father_name: "Imran Khan", monthly_fee: 8000 },
  { code: "SELC-0005", full_name: "Bilal Hussain", phone: "03110000005", father_name: "Hussain Shah", monthly_fee: 7000 },
  { code: "SELC-0006", full_name: "Mariam Saeed", phone: "03110000006", father_name: "Saeed Ahmad", monthly_fee: 8000 },
  { code: "SELC-0007", full_name: "Usman Tariq", phone: "03110000007", father_name: "Tariq Mehmood", monthly_fee: 7500 },
  { code: "SELC-0008", full_name: "Zainab Malik", phone: "03110000008", father_name: "Malik Asif", monthly_fee: 8000 },
  { code: "SELC-0009", full_name: "Hamza Sheikh", phone: "03110000009", father_name: "Sheikh Nawaz", monthly_fee: 7000 },
  { code: "SELC-0010", full_name: "Sara Iqbal", phone: "03110000010", father_name: "Iqbal Hussain", monthly_fee: 8000 },
] as const;

const BATCHES = [
  {
    name: "2:00 PM Weekday",
    class_type: "weekday" as const,
    start_time: "14:00",
    capacity: 20,
    // Grammar only
    schedule: [
      { session_type: "grammar" as const, start_time: "14:00", end_time: "15:00" },
    ],
  },
  {
    name: "3:00 PM Weekday",
    class_type: "weekday" as const,
    start_time: "15:00",
    capacity: 20,
    // Grammar only
    schedule: [
      { session_type: "grammar" as const, start_time: "15:00", end_time: "16:00" },
    ],
  },
  {
    name: "4:00 PM Weekday",
    class_type: "weekday" as const,
    start_time: "16:00",
    capacity: 20,
    // Grammar only
    schedule: [
      { session_type: "grammar" as const, start_time: "16:00", end_time: "17:00" },
    ],
  },
];

const LEVELS = ["Beginner", "Pre-Intermediate", "Intermediate", "Advanced"] as const;
const SESSION_TYPES = ["grammar"] as const;

function moduleTopics(level: string, session: string, moduleIndex: number) {
  const base = `${level} Grammar M${moduleIndex + 1}`;
  return Array.from({ length: 5 }, (_, i) => ({
    name: `${base} Topic ${i + 1}`,
    description: `Practice activity ${i + 1} for ${base.toLowerCase()}.`,
    sort_order: i + 1,
    assignment: {
      title: `${base} Assignment ${i + 1}`,
      instructions: `Record a short video completing the ${base.toLowerCase()} topic ${i + 1} task. Speak clearly and follow the class prompt.`,
      due_offset_days: 2,
    },
  }));
}

async function getUserByEmail(email: string) {
  let page = 1;
  while (page < 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) break;
    page += 1;
  }
  return null;
}

async function ensureAuthUser(user: SeedUser) {
  const existing = await getUserByEmail(user.email);
  if (existing) {
    await supabase.auth.admin.updateUserById(existing.id, {
      password: user.password,
      email_confirm: true,
      app_metadata: { role: user.role },
      user_metadata: { full_name: user.fullName, phone: user.phone ?? "" },
    });
    return existing.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    app_metadata: { role: user.role },
    user_metadata: { full_name: user.fullName, phone: user.phone ?? "" },
  });
  if (error) throw error;
  return data.user.id;
}

async function ensureProfile(userId: string, user: SeedUser) {
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      full_name: user.fullName,
      role: user.role,
      phone: user.phone ?? null,
      is_active: true,
      default_panel: user.defaultPanel ?? "management",
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

async function resetSeedData() {
  console.log("Resetting seed data (demo rows only)...");
  // Delete demo students by code range; cascading FKs handle related rows.
  const codes = DEMO_STUDENTS.map((s) => s.code);
  await supabase.from("students").delete().in("student_code", codes);
  await supabase.from("batches").delete().in("name", BATCHES.map((b) => b.name));
  // Remove curriculum levels created by seed (by name+session_type pair).
  for (const level of LEVELS) {
    for (const session of SESSION_TYPES) {
      await supabase.from("levels").delete().eq("name", level).eq("session_type", session);
    }
  }

  for (const user of [...STAFF_USERS, ...DEMO_STUDENTS.map((s) => ({
    email: `${s.code.toLowerCase()}@selc.local`,
  }))]) {
    const existing = await getUserByEmail(user.email);
    if (existing) await supabase.auth.admin.deleteUser(existing.id);
  }
  console.log("Reset complete.");
}

async function seedSettings() {
  const rows = [
    { key: "institute_name", value: "Sir Sahil's English Language Centre", description: "Public institute name" },
    { key: "institute_short_name", value: "SELC", description: "Short name" },
    { key: "institute_address", value: "Pakistan", description: "Institute address" },
    { key: "institute_phone", value: "03001234567", description: "Primary contact number" },
    { key: "institute_logo_url", value: "", description: "Logo URL" },
    { key: "receipt_footer", value: "Thank you for learning with Sir Sahil's English Language Centre.", description: "Receipt footer" },
    { key: "attendance_threshold", value: 75, description: "Minimum attendance percentage" },
    { key: "min_assignment_average", value: 50, description: "Minimum assignment average" },
    { key: "fee_due_day", value: 10, description: "Day of month when fees are due" },
    { key: "currency", value: "PKR", description: "Currency code" },
    { key: "timezone", value: "Asia/Karachi", description: "Institute timezone" },
  ];
  const { error } = await supabase.from("settings").upsert(rows, { onConflict: "key" });
  if (error) throw error;
}

async function seedStaff() {
  const ids: Record<string, string> = {};
  for (const user of STAFF_USERS) {
    const id = await ensureAuthUser(user);
    await ensureProfile(id, user);
    ids[user.role] = id;
    console.log(`  staff: ${user.email}`);
  }
  return ids;
}

async function main() {
  console.log(RESET ? "SELC seed: reset + seed" : "SELC seed: upsert");

  if (RESET) {
    await resetSeedData();
  }

  await seedSettings();
  console.log("Settings seeded.");

  await seedStaff();
  console.log("Staff seeded.");

  console.log("\nStaff credentials");
  console.log("  Teacher panel: teacher@gmail.com / teacher@123");
  console.log("  Management panel: owner@gmail.com / owner@123");
  console.log("\nStudents can login only after admin creates their accounts.");
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
