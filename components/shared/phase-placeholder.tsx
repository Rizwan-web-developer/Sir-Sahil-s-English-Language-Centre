import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { FeaturePreview } from "@/components/shared/feature-preview";
import { PageHeader } from "@/components/shared/page-header";

type PhasePlaceholderProps = {
  title: string;
  description: string;
  featureTitle: string;
  featureDescription: string;
  icon: LucideIcon;
  items: string[];
  eyebrow?: string;
  action?: ReactNode;
};

/** Page-level placeholder used while a module is still being built. */
export function PhasePlaceholder({
  title,
  description,
  featureTitle,
  featureDescription,
  icon,
  items,
  eyebrow,
  action,
}: PhasePlaceholderProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={action}
      />
      <FeaturePreview
        title={featureTitle}
        description={featureDescription}
        icon={icon}
        items={items}
      />
    </div>
  );
}
