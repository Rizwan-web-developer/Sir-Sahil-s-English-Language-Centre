import { CheckIcon, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { t } from "@/lib/i18n";

type FeaturePreviewProps = {
  phase: number;
  title: string;
  description: string;
  icon: LucideIcon;
  items: string[];
  action?: ReactNode;
};

/**
 * Intentional placeholder for a module that a later phase builds.
 * Explains *what* is coming instead of showing an empty screen.
 */
export function FeaturePreview({
  phase,
  title,
  description,
  icon: Icon,
  items,
  action,
}: FeaturePreviewProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/30">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Icon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant="outline" className="border-gold/40 bg-gold/10 text-gold-foreground dark:text-gold">
            {t.common.phase} {phase}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="grid gap-2 sm:grid-cols-2">
          {items.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 rounded-lg border bg-background/60 px-3 py-2.5 text-sm"
            >
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-gold-foreground dark:text-gold" />
              <span className="text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
        {action && <div className="flex flex-wrap gap-2 pt-1">{action}</div>}
      </CardContent>
    </Card>
  );
}
