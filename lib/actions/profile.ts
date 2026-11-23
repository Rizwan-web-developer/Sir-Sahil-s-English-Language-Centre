"use server";

import { revalidatePath } from "next/cache";

import { requireSession, requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type Result<T = undefined> = { ok: true; data: T; message?: string } | { ok: false; error: string };

function extFromName(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "webp") return ext;
  return "png";
}

export async function uploadProfileAvatarAction(formData: FormData): Promise<Result<{ url: string }>> {
  const session = await requireSession();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) return { ok: false, error: "Please select an image." };
  if (!file.type.startsWith("image/")) return { ok: false, error: "Only image files are allowed." };
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: "Image must be 5 MB or smaller." };

  const supabase = await createClient();
  const ext = extFromName(file.name);
  const path = `${session.profile.id}/avatar.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, bytes, {
    upsert: true,
    contentType: file.type,
    cacheControl: "3600",
  });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
  const url = `${pub.publicUrl}?t=${Date.now()}`;
  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", session.profile.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true, data: { url }, message: "Profile photo updated." };
}

export async function uploadInstituteLogoAction(formData: FormData): Promise<Result<{ url: string }>> {
  const type = String(formData.get("type") ?? "institute") === "management" ? "management" : "institute";
  const session = await requireStaff();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) return { ok: false, error: "Please select a PNG/logo image." };
  if (!file.type.startsWith("image/")) return { ok: false, error: "Only image files are allowed." };
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: "Image must be 5 MB or smaller." };

  const supabase = await createClient();
  const ext = extFromName(file.name);
  const path = `branding/${type}-logo.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, bytes, {
    upsert: true,
    contentType: file.type,
    cacheControl: "3600",
  });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
  const url = `${pub.publicUrl}?t=${Date.now()}`;
  const key = type === "management" ? "management_logo_url" : "institute_logo_url";
  const { error } = await supabase.from("settings").upsert({ key, value: url, updated_by: session.profile.id }, { onConflict: "key" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true, data: { url }, message: type === "management" ? "Management logo updated." : "Institute logo updated." };
}
