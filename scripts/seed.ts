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
  phone?: string;
};

const STAFF_USERS: SeedUser[] = [
  {
    email: "sir.sahil@selc.pk",
    password: "Owner@12345",
    fullName: "Sir Sahil",
    role: "owner",
    phone: "03001234567",
  },
  {
    email: "reception@selc.pk",
    password: "Reception@12345",
    fullName: "Reception Desk",
    role: "reception",
    phone: "03007654321",
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
    // 2 PM batch: Conversation 2-3, Grammar 3-4
    schedule: [
      { session_type: "conversation" as const, start_time: "14:00", end_time: "15:00" },
      { session_type: "grammar" as const, start_time: "15:00", end_time: "16:00" },
    ],
  },
  {
    name: "3:00 PM Weekday",
    class_type: "weekday" as const,
    start_time: "15:00",
    capacity: 20,
    // 3 PM batch: Grammar 3-4, Conversation 4-5
    schedule: [
      { session_type: "grammar" as const, start_time: "15:00", end_time: "16:00" },
      { session_type: "conversation" as const, start_time: "16:00", end_time: "17:00" },
    ],
  },
  {
    name: "4:00 PM Weekday",
    class_type: "weekday" as const,
    start_time: "16:00",
    capacity: 20,
    // 4 PM batch: Conversation 4-5, Grammar 5-6
    schedule: [
      { session_type: "conversation" as const, start_time: "16:00", end_time: "17:00" },
      { session_type: "grammar" as const, start_time: "17:00", end_time: "18:00" },
    ],
  },
];

const LEVELS = ["Beginner", "Pre-Intermediate", "Intermediate", "Advanced"] as const;
const SESSION_TYPES = ["conversation", "grammar"] as const;

function moduleTopics(level: string, session: string, moduleIndex: number) {
  const base = `${level} ${session === "conversation" ? "Conversation" : "Grammar"} M${moduleIndex + 1}`;
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

async function seedStudents() {
  const studentIds: Array<{ studentId: string; profileId: string; code: string }> = [];

  for (const demo of DEMO_STUDENTS) {
    const email = `${demo.code.toLowerCase()}@selc.local`;
    const profileId = await ensureAuthUser({
      email,
      password: STUDENT_PASSWORD,
      fullName: demo.full_name,
      role: "student",
      phone: demo.phone,
    });
    await ensureProfile(profileId, {
      email,
      password: STUDENT_PASSWORD,
      fullName: demo.full_name,
      role: "student",
      phone: demo.phone,
    });

    const { data: existing } = await supabase
      .from("students")
      .select("id")
      .eq("student_code", demo.code)
      .maybeSingle();

    const payload = {
      student_code: demo.code,
      profile_id: profileId,
      full_name: demo.full_name,
      father_name: demo.father_name,
      phone: demo.phone,
      parent_phone: demo.phone,
      whatsapp: demo.phone,
      status: "active" as const,
      monthly_fee: demo.monthly_fee,
      discount: 0,
      is_archived: false,
    };

    let studentId = existing?.id as string | undefined;
    if (studentId) {
      const { error } = await supabase.from("students").update(payload).eq("id", studentId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from("students")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      studentId = data.id;
    }

    studentIds.push({ studentId: studentId!, profileId, code: demo.code });
    console.log(`  student: ${demo.code} ${demo.full_name}`);
  }

  // Keep the sequence ahead of the seeded codes so future auto-inserts don't clash.
  const maxCode = DEMO_STUDENTS.reduce((max, s) => {
    const n = Number(s.code.replace("SELC-", ""));
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
  const { error: seqError } = await supabase.rpc("seed_set_student_code_seq", {
    p_value: maxCode,
  });
  if (seqError) {
    console.warn(
      "  warning: could not advance student_code_seq (apply 006_seed_helpers.sql).",
      seqError.message,
    );
  }

  return studentIds;
}

async function seedBatches(students: Array<{ studentId: string }>) {
  const batchIds: string[] = [];

  for (const batch of BATCHES) {
    const { data: existing } = await supabase
      .from("batches")
      .select("id")
      .eq("name", batch.name)
      .maybeSingle();

    const payload = {
      name: batch.name,
      class_type: batch.class_type,
      start_time: batch.start_time,
      capacity: batch.capacity,
      status: "active" as const,
    };

    let batchId = existing?.id as string | undefined;
    if (batchId) {
      const { error } = await supabase.from("batches").update(payload).eq("id", batchId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from("batches").insert(payload).select("id").single();
      if (error) throw error;
      batchId = data.id;
    }

    batchIds.push(batchId!);

    // Rebuild schedule for determinism.
    await supabase.from("batch_schedule").delete().eq("batch_id", batchId);

    const scheduleRows = [];
    for (let day = 1; day <= 5; day += 1) {
      for (const session of batch.schedule) {
        scheduleRows.push({
          batch_id: batchId,
          day_of_week: day,
          session_type: session.session_type,
          start_time: session.start_time,
          end_time: session.end_time,
        });
      }
    }
    const { error: scheduleError } = await supabase.from("batch_schedule").insert(scheduleRows);
    if (scheduleError) throw scheduleError;

    console.log(`  batch: ${batch.name}`);
  }

  // Distribute students: 4, 3, 3
  const distribution = [batchIds[0], batchIds[0], batchIds[0], batchIds[0], batchIds[1], batchIds[1], batchIds[1], batchIds[2], batchIds[2], batchIds[2]];
  for (let i = 0; i < students.length; i += 1) {
    const batchId = distribution[i];
    const studentId = students[i].studentId;
    // Keep one active enrollment per student for the seed.
    await supabase.from("batch_students").delete().eq("student_id", studentId);
    const { error } = await supabase.from("batch_students").insert({
      batch_id: batchId,
      student_id: studentId,
      active: true,
      joined_on: new Date().toISOString().slice(0, 10),
    });
    if (error) throw error;
  }

  return batchIds;
}

async function seedCurriculum() {
  for (const sessionType of SESSION_TYPES) {
    for (let levelIndex = 0; levelIndex < LEVELS.length; levelIndex += 1) {
      const levelName = LEVELS[levelIndex];
      const { data: existingLevel } = await supabase
        .from("levels")
        .select("id")
        .eq("name", levelName)
        .eq("session_type", sessionType)
        .maybeSingle();

      const levelPayload = {
        name: levelName,
        session_type: sessionType,
        sort_order: levelIndex + 1,
        description: `${levelName} ${sessionType} track.`,
      };

      let levelId = existingLevel?.id as string | undefined;
      if (levelId) {
        const { error } = await supabase.from("levels").update(levelPayload).eq("id", levelId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("levels").insert(levelPayload).select("id").single();
        if (error) throw error;
        levelId = data.id;
      }

      // Rebuild modules/topics/assignments for clean seed.
      await supabase.from("modules").delete().eq("level_id", levelId);

      for (let m = 0; m < 2; m += 1) {
        const moduleName = `${levelName} ${sessionType === "conversation" ? "Conversation" : "Grammar"} Module ${m + 1}`;
        const { data: module, error: moduleError } = await supabase
          .from("modules")
          .insert({
            level_id: levelId,
            name: moduleName,
            session_type: sessionType,
            sort_order: m + 1,
            description: `Core ${sessionType} practice for ${levelName.toLowerCase()} learners.`,
          })
          .select("id")
          .single();
        if (moduleError) throw moduleError;

        const topics = moduleTopics(levelName, sessionType, m);
        for (const topic of topics) {
          const { data: topicRow, error: topicError } = await supabase
            .from("topics")
            .insert({
              module_id: module.id,
              name: topic.name,
              session_type: sessionType,
              description: topic.description,
              sort_order: topic.sort_order,
            })
            .select("id")
            .single();
          if (topicError) throw topicError;

          const { error: assignmentError } = await supabase.from("topic_assignments").insert({
            topic_id: topicRow.id,
            title: topic.assignment.title,
            instructions: topic.assignment.instructions,
            session_type: sessionType,
            sort_order: 1,
            due_offset_days: topic.assignment.due_offset_days,
          });
          if (assignmentError) throw assignmentError;
        }
      }
      console.log(`  curriculum: ${levelName} / ${sessionType}`);
    }
  }
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

  const students = await seedStudents();
  console.log("Students seeded.");

  await seedBatches(students);
  console.log("Batches seeded.");

  await seedCurriculum();
  console.log("Curriculum seeded.");

  console.log("\nDemo credentials");
  console.log("  Owner:     sir.sahil@selc.pk / Owner@12345");
  console.log("  Reception: reception@selc.pk / Reception@12345");
  console.log("  Students:  SELC-0001..SELC-0010 / Student@12345");
  console.log("\nStudent login accepts student code or phone number as the identifier.");
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
