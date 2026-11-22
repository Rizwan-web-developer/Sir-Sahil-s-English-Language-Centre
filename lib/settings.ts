import "server-only";

import { cache } from "react";

import { DEFAULT_SETTINGS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export type SettingsMap = Record<string, unknown>;

/**
 * Read institute settings, merged over safe defaults.
 * Cached per request. Missing table (pre-migration) falls back to defaults.
 */
export const getSettings = cache(async (): Promise<SettingsMap> => {
  const merged: SettingsMap = { ...DEFAULT_SETTINGS };

  try {
    const supabase = await createClient();
    const { data } = await supabase.from("settings").select("key, value");

    for (const row of data ?? []) {
      if (row?.key) merged[row.key as string] = row.value;
    }
  } catch {
    // Supabase might not be configured yet; defaults keep the UI usable.
  }

  return merged;
});

export function settingString(
  settings: SettingsMap,
  key: string,
  fallback = "",
): string {
  const value = settings[key];
  return typeof value === "string" ? value : fallback;
}

export function settingNumber(
  settings: SettingsMap,
  key: string,
  fallback = 0,
): number {
  const value = settings[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
