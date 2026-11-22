import type { Metadata } from "next";
import {
  BookOpenCheckIcon,
  CheckCircle2Icon,
  CircleIcon,
  LayersIcon,
} from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SessionBadge } from "@/components/shared/session-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireStudent } from "@/lib/auth/session";
import { getPortalProgress, type ProgressLevel } from "@/lib/data/portal";
import { formatDate } from "@/lib/format";
import { sessionLabel, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { SessionType } from "@/types/domain";

export const metadata: Metadata = { title: "Course progress" };

function LevelCard({
  level,
  current,
}: {
  level: ProgressLevel;
  current: boolean;
}) {
  return (
    <Card className={cn(current && "border-primary/30 ring-1 ring-primary/10")}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
              {level.name}
              {current && (
                <Badge
                  variant="outline"
                  className="border-gold/40 bg-gold/10 text-[10px] text-gold-foreground dark:text-gold"
                >
                  Current
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              {level.completedTopics} of {level.totalTopics} topics completed
            </CardDescription>
          </div>
          <span className="font-heading text-lg font-semibold tabular-nums">
            {level.percent}%
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              level.percent === 100 ? "bg-success" : "bg-primary",
            )}
            style={{ width: `${level.percent}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {level.modules.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            This level has no modules yet.
          </p>
        ) : (
          level.modules.map((module) => (
            <div key={module.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <LayersIcon className="size-3.5 text-muted-foreground" />
                <p className="text-xs font-semibold">{module.name}</p>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {module.completed}/{module.topics.length}
                </span>
              </div>
              <ul className="space-y-1 border-l pl-3">
                {module.topics.map((topic) => (
                  <li
                    key={topic.id}
                    className="flex items-start gap-2 py-0.5 text-xs"
                  >
                    {topic.completed_on ? (
                      <CheckCircle2Icon className="mt-0.5 size-3.5 shrink-0 text-success" />
                    ) : (
                      <CircleIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50" />
                    )}
                    <span
                      className={cn(
                        "min-w-0 flex-1",
                        topic.completed_on && "text-muted-foreground",
                      )}
                    >
                      {topic.name}
                    </span>
                    {topic.completed_on && (
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {formatDate(topic.completed_on, {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function SessionProgress({
  type,
  levels,
}: {
  type: SessionType;
  levels: ProgressLevel[];
}) {
  const totalTopics = levels.reduce((sum, level) => sum + level.totalTopics, 0);
  const completedTopics = levels.reduce(
    (sum, level) => sum + level.completedTopics,
    0,
  );
  const percent =
    totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
  const currentId = levels.find((level) => level.percent < 100)?.id ?? null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-heading text-base font-semibold">
          {sessionLabel(type)}
        </h2>
        <SessionBadge type={type} />
        <span className="ml-auto text-[11px] text-muted-foreground">
          {completedTopics}/{totalTopics} topics · {percent}%
        </span>
      </div>

      {levels.length === 0 ? (
        <EmptyState
          compact
          icon={BookOpenCheckIcon}
          title={`${sessionLabel(type)} curriculum is empty`}
          description="Your teacher adds levels, modules and topics from the teaching panel."
        />
      ) : (
        <div className="space-y-3">
          {levels.map((level) => (
            <LevelCard
              key={level.id}
              level={level}
              current={level.id === currentId}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default async function PortalProgressPage() {
  const { profile } = await requireStudent();
  const progress = await getPortalProgress(profile.id);

  const conversation = progress.levels.filter(
    (level) => level.session_type === "conversation",
  );
  const grammar = progress.levels.filter(
    (level) => level.session_type === "grammar",
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t.nav.portalGroup}
        title={t.nav.course}
        description="Topic-by-topic progress for your batch, in both sessions."
      />

      {!progress.batch ? (
        <EmptyState
          icon={BookOpenCheckIcon}
          title="No batch assigned yet"
          description="Once reception places you in a batch, your course progress will appear here."
        />
      ) : (
        <>
          <Card className="bg-muted/30">
            <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-xs">
              <span className="font-medium">{progress.batch.name}</span>
              <span className="text-muted-foreground">
                {t.classType[progress.batch.class_type]} batch
              </span>
              <span className="text-muted-foreground">
                {progress.batch.start_time.slice(0, 5)} start
              </span>
            </CardContent>
          </Card>

          <SessionProgress type="conversation" levels={conversation} />
          <SessionProgress type="grammar" levels={grammar} />
        </>
      )}
    </div>
  );
}
