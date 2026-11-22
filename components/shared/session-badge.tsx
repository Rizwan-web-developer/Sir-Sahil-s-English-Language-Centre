import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { sessionLabel } from "@/lib/i18n";
import type { SessionType } from "@/types/domain";

export function SessionBadge({
  type,
  className,
  showDot = true,
}: {
  type: SessionType;
  className?: string;
  showDot?: boolean;
}) {
  const isGrammar = type === "grammar";

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5",
        isGrammar
          ? "border-gold/40 bg-gold/12 text-gold-foreground dark:text-gold"
          : "border-primary/25 bg-primary/8 text-primary",
        className,
      )}
    >
      {showDot && (
        <span
          aria-hidden
          className={cn(
            "size-1.5 rounded-full",
            isGrammar ? "bg-gold" : "bg-primary",
          )}
        />
      )}
      {sessionLabel(type)}
    </Badge>
  );
}
