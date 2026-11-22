import { getSettings, settingString } from "@/lib/settings";

export type TemplateKey = "fee_reminder" | "absent_notice" | "class_reminder" | "certificate_issued" | "birthday_wish";

export const DEFAULT_TEMPLATES: Record<TemplateKey, string> = {
  fee_reminder: "Dear {{name}}, your fee of {{amount}} for {{month}} is pending. Please pay at the institute.",
  absent_notice: "Dear {{name}}, you were marked absent on {{date}}. Please contact the institute if needed.",
  class_reminder: "Dear {{name}}, reminder: your {{session}} class starts at {{time}}.",
  certificate_issued: "Congratulations {{name}}! Your {{level}} certificate has been issued. Verify: {{url}}",
  birthday_wish: "Happy birthday {{name}}! Best wishes from Sir Sahil's English Language Centre.",
};

export function renderTemplate(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

export async function getTemplate(key: TemplateKey) {
  const settings = await getSettings();
  return settingString(settings, `template_${key}`, DEFAULT_TEMPLATES[key]);
}
