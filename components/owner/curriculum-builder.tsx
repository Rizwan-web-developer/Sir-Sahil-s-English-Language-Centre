"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createCurriculumItemAction } from "@/lib/actions/curriculum";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Row = Record<string, unknown>;

export function CurriculumBuilder({ session, tree }: { session: "grammar"; tree: Row[] }) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"level" | "module" | "topic" | "assignment">("level");
  const [parentId, setParentId] = useState("");

  function create() {
    if (!name.trim()) return toast.error("Name is required");
    startTransition(async () => {
      const res = await createCurriculumItemAction({ kind, parentId: parentId || undefined, session_type: session, name: name.trim() });
      if (!res.ok) toast.error(res.error); else { toast.success(res.message ?? "Created"); setName(""); }
    });
  }

  const levels = tree as Row[];
  const modules: Row[] = levels.flatMap((l) => (((l.modules as Row[]) ?? [])).map((m) => ({ ...(m as Row), levelName: String(l.name) })));
  const topics: Row[] = modules.flatMap((m) => (((m.topics as Row[]) ?? [])).map((t) => ({ ...(t as Row), moduleName: String(m.name) })));

  return (
    <div className="space-y-4">
      <Card><CardContent className="pt-6 flex flex-wrap gap-2 items-end">
        <div className="space-y-1"><p className="text-xs text-muted-foreground">Track</p>
          <Input value="Grammar" readOnly className="w-44 bg-muted/40" />
        </div>
        <div className="space-y-1"><p className="text-xs text-muted-foreground">Add</p>
          <Select value={kind} onValueChange={(v) => setKind((v as typeof kind) ?? "level")}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="level">Level</SelectItem><SelectItem value="module">Module</SelectItem><SelectItem value="topic">Topic</SelectItem><SelectItem value="assignment">Assignment</SelectItem></SelectContent>
          </Select>
        </div>
        {(kind === "module") && <Select value={parentId} onValueChange={(v) => setParentId(v ?? "")}><SelectTrigger className="w-56"><SelectValue placeholder="Parent level" /></SelectTrigger><SelectContent>{levels.map((l)=><SelectItem key={String(l.id)} value={String(l.id)}>{String(l.name)}</SelectItem>)}</SelectContent></Select>}
        {(kind === "topic") && <Select value={parentId} onValueChange={(v) => setParentId(v ?? "")}><SelectTrigger className="w-56"><SelectValue placeholder="Parent module" /></SelectTrigger><SelectContent>{modules.map((m)=><SelectItem key={String(m.id)} value={String(m.id)}>{String(m.levelName)} · {String(m.name)}</SelectItem>)}</SelectContent></Select>}
        {(kind === "assignment") && <Select value={parentId} onValueChange={(v) => setParentId(v ?? "")}><SelectTrigger className="w-56"><SelectValue placeholder="Parent topic" /></SelectTrigger><SelectContent>{topics.map((t)=><SelectItem key={String(t.id)} value={String(t.id)}>{String(t.moduleName)} · {String(t.name)}</SelectItem>)}</SelectContent></Select>}
        <Input className="w-64" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name / title" />
        <Button onClick={create} disabled={isPending}>Add</Button>
      </CardContent></Card>

      <div className="space-y-4">
        {levels.map((l) => (
          <Card key={String(l.id)}>
            <CardHeader><CardTitle className="text-base flex items-center gap-2">{String(l.name)} <Badge variant="outline" className="capitalize">{session}</Badge></CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(((l.modules as Row[]) ?? [])).map((m) => (
                <div key={String(m.id)} className="rounded-lg border p-3">
                  <p className="font-medium">{String(m.name)}</p>
                  <div className="mt-2 space-y-1">
                    {(((m.topics as Row[]) ?? [])).map((t) => (
                      <div key={String(t.id)} className="rounded-md bg-muted/30 px-3 py-2 text-sm">
                        <div className="flex items-center justify-between gap-2"><span>{String(t.name)}</span><span className="text-xs text-muted-foreground">{(((t.topic_assignments as Row[]) ?? []).length)} assignments</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {(((l.modules as Row[]) ?? []).length === 0) && <p className="text-sm text-muted-foreground">No modules yet.</p>}
            </CardContent>
          </Card>
        ))}
        {levels.length === 0 && <Card><CardContent className="pt-6 text-sm text-muted-foreground">No curriculum yet for this track. Add a level to begin.</CardContent></Card>}
      </div>
    </div>
  );
}
