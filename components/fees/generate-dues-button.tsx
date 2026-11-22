"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { LoaderCircleIcon } from "lucide-react";

import { generateDuesAction } from "@/lib/actions/fees";
import { Button } from "@/components/ui/button";
import { currentMonthStart } from "@/lib/format";

export function GenerateDuesButton() {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={isPending}
      onClick={() => startTransition(async () => {
        const result = await generateDuesAction({ period_month: currentMonthStart() });
        if (!result.ok) toast.error(result.error);
        else toast.success(result.message ?? "Dues generated");
      })}
    >
      {isPending && <LoaderCircleIcon className="size-4 animate-spin" />}
      Generate this month&apos;s dues
    </Button>
  );
}
