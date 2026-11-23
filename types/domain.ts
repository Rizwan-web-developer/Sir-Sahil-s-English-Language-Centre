/**
 * Domain types mirroring the Supabase schema.
 *
 * These are hand-written because the database is migrated with SQL files
 * instead of the Supabase CLI type generator. Keep them in sync with
 * `supabase/migrations`.
 */

export type UserRole = "owner" | "reception" | "student";
export type StudentStatus = "active" | "frozen" | "left" | "completed";
export type ClassType = "weekday" | "weekend";
export type BatchStatus = "active" | "closed";
export type SessionType = "conversation" | "grammar";
export type AttendanceStatus = "present" | "absent" | "late" | "leave";
export type MarkedVia =
  | "scanner"
  | "manual_code"
  | "search"
  | "camera"
  | "manual_edit";
export type FeeStatus = "pending" | "partial" | "paid" | "waived" | "overdue";
export type PaymentMethod =
  | "cash"
  | "bank_transfer"
  | "jazzcash"
  | "easypaisa"
  | "card"
  | "other";
export type SubmissionStatus =
  | "pending"
  | "submitted"
  | "reviewed"
  | "needs_rework"
  | "late"
  | "resubmit_requested";
export type CertificateStatus = "pending" | "approved" | "issued" | "rejected" | "revoked";

export type StaffPanel = "teacher" | "management";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  must_change_password: boolean;
  default_panel: StaffPanel;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  student_code: string;
  /** Short numeric ID (3306, 3307, ...) used on QR codes and attendance. */
  student_number: number;
  profile_id: string | null;
  full_name: string;
  father_name: string | null;
  phone: string;
  parent_phone: string | null;
  whatsapp: string | null;
  cnic_or_bform: string | null;
  address: string | null;
  photo_url: string | null;
  date_of_birth: string | null;
  admission_date: string;
  status: StudentStatus;
  monthly_fee: number;
  discount: number;
  notes: string | null;
  is_archived: boolean;
  card_issued_at: string | null;
  card_reprint_count: number;
  created_at: string;
  updated_at: string;
}

export interface Batch {
  id: string;
  name: string;
  class_type: ClassType;
  start_time: string;
  capacity: number;
  start_date: string;
  status: BatchStatus;
  notes: string | null;
  current_conversation_level_id: string | null;
  current_grammar_level_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BatchSchedule {
  id: string;
  batch_id: string;
  day_of_week: number;
  session_type: SessionType;
  start_time: string;
  end_time: string;
}

export interface BatchStudent {
  id: string;
  batch_id: string;
  student_id: string;
  joined_on: string;
  left_on: string | null;
  active: boolean;
}

export interface FeeRecord {
  id: string;
  student_id: string;
  batch_id: string | null;
  period_month: string;
  amount_due: number;
  discount: number;
  amount_paid: number;
  due_date: string;
  status: FeeStatus;
  notes: string | null;
}

export interface Payment {
  id: string;
  fee_record_id: string | null;
  student_id: string;
  amount: number;
  method: PaymentMethod;
  paid_on: string;
  receipt_no: string | null;
  received_by: string | null;
  notes: string | null;
}

export interface Attendance {
  id: string;
  student_id: string;
  batch_id: string;
  session_type: SessionType;
  date: string;
  status: AttendanceStatus;
  marked_by: string | null;
  marked_via: MarkedVia;
  marked_at: string;
  note: string | null;
}

export interface Level {
  id: string;
  name: string;
  session_type: SessionType;
  sort_order: number;
  description: string | null;
}

export interface Module {
  id: string;
  level_id: string;
  name: string;
  session_type: SessionType;
  description: string | null;
  sort_order: number;
  estimated_classes: number | null;
}

export interface Topic {
  id: string;
  module_id: string;
  name: string;
  session_type: SessionType;
  description: string | null;
  sort_order: number;
  estimated_classes: number | null;
}

export interface TopicAssignment {
  id: string;
  topic_id: string;
  title: string;
  instructions: string | null;
  session_type: SessionType;
  sort_order: number;
  due_offset_days: number;
  submission_type: "video" | "text" | "both";
  max_marks: number;
}

export interface BatchProgress {
  id: string;
  batch_id: string;
  session_type: SessionType;
  topic_id: string;
  completed_on: string;
  completed_by: string | null;
  note: string | null;
  skipped: boolean;
  skip_reason: string | null;
}

export interface Submission {
  id: string;
  student_id: string;
  assignment_id: string;
  video_url: string | null;
  video_key: string | null;
  status: SubmissionStatus;
  marks: number | null;
  feedback: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface Ranking {
  id: string;
  batch_id: string;
  student_id: string;
  level_id: string;
  rank: number;
  score: number | null;
  given_by: string | null;
  notes: string | null;
}

export interface Certificate {
  id: string;
  certificate_no: string;
  student_id: string;
  level_id: string;
  issued_on: string | null;
  approved_by: string | null;
  status: CertificateStatus;
  verification_token: string;
}

export interface AuditLog {
  id: number;
  user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

export interface Setting {
  key: string;
  value: unknown;
  description: string | null;
}

export interface InstituteHoliday {
  id: string;
  holiday_date: string;
  name: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentLeave {
  id: string;
  student_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Supabase embeds used by dashboard queries. */
export interface ScheduleWithBatch extends BatchSchedule {
  batch: Pick<Batch, "id" | "name" | "class_type"> | null;
}

export interface BatchStudentWithBatch extends BatchStudent {
  batch: Pick<Batch, "id" | "name" | "class_type" | "start_time"> | null;
}

/** Role-aware session shape returned by `lib/auth/session.ts`. */
export interface SessionContext {
  profile: Profile;
  email: string;
}
