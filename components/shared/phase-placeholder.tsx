import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { FeaturePreview } from "@/components/shared/feature-preview";
import { PageHeader } from "@/components/shared/page-header";

type PhasePlaceholderProps = {
  title: string;
  description: string;
  phase: number;
  featureTitle: string;
  featureDescription: string;
  icon: LucideIcon;
  items: string[];
  eyebrow?: string;
  action?: ReactNode;
};

/** Page-level placeholder used while a later phase is still being built. */
export function PhasePlaceholder({
  title,
  description,
  phase,
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
        phase={phase}
        title={featureTitle}
        description={featureDescription}
        icon={icon}
        items={items}
      />
    </div>
  );
}
