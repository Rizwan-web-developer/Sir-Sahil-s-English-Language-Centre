"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BookOpenIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  createCurriculumItemAction,
  deleteCurriculumItemAction,
  updateCurriculumItemAction,
} from "@/lib/actions/curriculum";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Node = Record<string, unknown>;
type Kind = "level" | "module" | "topic";

function children(value: unknown): Node[] {
  return Array.isArray(value) ? (value as Node[]) : [];
}

function label(item: Node) {
  return String(item.name ?? item.title ?? "Untitled");
}

type Props = {
  tree: Node[];
  /** When set, only this course is shown (used inside a batch). */
  onlyLevelId?: string;
  /** Hide the "add course" card (batch view). */
  hideAddCourse?: boolean;
};

export function CourseManager({ tree, onlyLevelId, hideAddCourse }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newCourse, setNewCourse] = useState("");
  const [moduleDraft, setModuleDraft] = useState<Record<string, string>>({});
  const [topicDraft, setTopicDraft] = useState<Record<string, string>>({});
  const [renameTarget, setRenameTarget] = useState<{ kind: Kind; id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ kind: Kind; id: string; name: string } | null>(null);

  const levels = tree.filter((level) => !onlyLevelId || String(level.id) === onlyLevelId);

  function run(task: () => Promise<{ ok: true; message?: string } | { ok: false; error: string }>, fallback: string, onOk?: () => void) {
    startTransition(async () => {
      const res = await task();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? fallback);
      onOk?.();
      router.refresh();
    });
  }

  function addCourse() {
    const name = newCourse.trim();
    if (!name) return toast.error("Course name is required.");
    run(() => createCurriculumItemAction({ kind: "level", session_type: "grammar", name }), "Course added", () => setNewCourse(""));
  }

  function addModule(levelId: string) {
    const name = (moduleDraft[levelId] ?? "").trim();
    if (!name) return toast.error("Module name is required.");
    run(() => createCurriculumItemAction({ kind: "module", parentId: levelId, session_type: "grammar", name }), "Module added", () =>
      setModuleDraft((current) => ({ ...current, [levelId]: "" })),
    );
  }

  function addTopic(moduleId: string) {
    const name = (topicDraft[moduleId] ?? "").trim();
    if (!name) return toast.error("Topic name is required.");
    run(() => createCurriculumItemAction({ kind: "topic", parentId: moduleId, session_type: "grammar", name }), "Topic added", () =>
      setTopicDraft((current) => ({ ...current, [moduleId]: "" })),
    );
  }

  function openRename(kind: Kind, item: Node) {
    const name = label(item);
    setRenameTarget({ kind, id: String(item.id), name });
    setRenameValue(name);
  }

  function submitRename() {
    if (!renameTarget) return;
    const name = renameValue.trim();
    if (!name) return toast.error("Name is required.");
    if (name === renameTarget.name) return setRenameTarget(null);
    run(() => updateCurriculumItemAction({ kind: renameTarget.kind, id: renameTarget.id, name }), "Renamed", () => setRenameTarget(null));
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    run(() => deleteCurriculumItemAction({ kind: deleteTarget.kind, id: deleteTarget.id }), "Deleted", () => setDeleteTarget(null));
  }

  return (
    <div className="space-y-4">
      {!hideAddCourse && !onlyLevelId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpenIcon className="size-4 text-muted-foreground" />
              Add course
            </CardTitle>
            <CardDescription>Courses hold the modules and topics taught in each batch.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Input
                value={newCourse}
                onChange={(event) => setNewCourse(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCourse();
                  }
                }}
                placeholder="e.g. Beginner"
                className="max-w-xs"
              />
              <Button type="button" onClick={addCourse} disabled={isPending}>
                <PlusIcon className="size-4" />
                Add course
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {levels.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No course found. Add a course to start building modules and topics.
          </CardContent>
        </Card>
      ) : (
        levels.map((level) => {
          const levelId = String(level.id);
          const modules = children(level.modules);
          return (
            <Card key={levelId}>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    {label(level)}
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">Course</Badge>
                  </CardTitle>
                  <CardDescription>
                    {modules.length} {modules.length === 1 ? "module" : "modules"} · {modules.reduce((sum, module) => sum + children(module.topics).length, 0)} topics
                  </CardDescription>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Rename course" onClick={() => openRename("level", level)} disabled={isPending}>
                    <PencilIcon className="size-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Delete course" onClick={() => setDeleteTarget({ kind: "level", id: levelId, name: label(level) })} disabled={isPending}>
                    <Trash2Icon className="size-3.5 text-destructive" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {modules.length === 0 && (
                  <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">No modules yet. Add the first module below.</p>
                )}

                {modules.map((module) => {
                  const moduleId = String(module.id);
                  const topics = children(module.topics);
                  return (
                    <div key={moduleId} className="rounded-lg border bg-muted/20 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate text-sm font-medium">{label(module)}</p>
                          <Badge variant="secondary" className="text-[10px]">{topics.length} {topics.length === 1 ? "topic" : "topics"}</Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button type="button" variant="ghost" size="icon-xs" aria-label="Rename module" onClick={() => openRename("module", module)} disabled={isPending}>
                            <PencilIcon className="size-3" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon-xs" aria-label="Delete module" onClick={() => setDeleteTarget({ kind: "module", id: moduleId, name: label(module) })} disabled={isPending}>
                            <Trash2Icon className="size-3 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-2 space-y-1">
                        {topics.map((topic) => (
                          <div key={String(topic.id)} className="flex items-center justify-between gap-2 rounded-md bg-background px-3 py-1.5">
                            <span className="truncate text-sm">{label(topic)}</span>
                            <div className="flex shrink-0 gap-0.5">
                              <Button type="button" variant="ghost" size="icon-xs" aria-label="Rename topic" onClick={() => openRename("topic", topic)} disabled={isPending}>
                                <PencilIcon className="size-3" />
                              </Button>
                              <Button type="button" variant="ghost" size="icon-xs" aria-label="Delete topic" onClick={() => setDeleteTarget({ kind: "topic", id: String(topic.id), name: label(topic) })} disabled={isPending}>
                                <Trash2Icon className="size-3 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {topics.length === 0 && <p className="px-1 text-xs text-muted-foreground">No topics yet.</p>}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <Input
                          value={topicDraft[moduleId] ?? ""}
                          onChange={(event) => setTopicDraft((current) => ({ ...current, [moduleId]: event.target.value }))}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              addTopic(moduleId);
                            }
                          }}
                          placeholder="New topic name"
                          className="h-8 max-w-xs"
                        />
                        <Button type="button" variant="outline" size="sm" onClick={() => addTopic(moduleId)} disabled={isPending}>
                          <PlusIcon className="size-3.5" />
                          Add topic
                        </Button>
                      </div>
                    </div>
                  );
                })}

                <div className="flex flex-wrap gap-2">
                  <Input
                    value={moduleDraft[levelId] ?? ""}
                    onChange={(event) => setModuleDraft((current) => ({ ...current, [levelId]: event.target.value }))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addModule(levelId);
                      }
                    }}
                    placeholder="New module name"
                    className="h-8 max-w-xs"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => addModule(levelId)} disabled={isPending}>
                    <PlusIcon className="size-3.5" />
                    Add module
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      <Dialog open={Boolean(renameTarget)} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {renameTarget?.kind}</DialogTitle>
            <DialogDescription>Update the name and save.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-value">Name</Label>
            <Input id="rename-value" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), submitRename())} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRenameTarget(null)} disabled={isPending}>Cancel</Button>
            <Button type="button" onClick={submitRename} disabled={isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.kind}?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteTarget?.name}” and everything inside it will be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isPending}>{isPending ? "Deleting..." : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
