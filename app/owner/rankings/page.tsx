import type { Metadata } from "next";
import { TrophyIcon } from "lucide-react";

import { PhasePlaceholder } from "@/components/shared/phase-placeholder";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: "Rankings" };

export default function OwnerRankingsPage() {
  return (
    <PhasePlaceholder
      eyebrow={t.nav.teachingGroup}
      title={t.nav.rankings}
      description="Class rankings per level, awarded by the owner."
      phase={6}
      featureTitle="Rank each batch, level by level"
      featureDescription="Rankings combine assignment marks and attendance, then Sir Sahil confirms the final order."
      icon={TrophyIcon}
      items={[
        "Batch and level selector with a live leaderboard",
        "Assignment average and attendance shown next to each student",
        "Owner-only awarding with an audit trail of every change",
        "Students see their own rank in the portal",
      ]}
    />
  );
}
