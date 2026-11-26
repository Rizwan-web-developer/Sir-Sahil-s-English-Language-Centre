"use client";

import { useEffect, useState } from "react";
import { BookOpenIcon, LoaderCircleIcon } from "lucide-react";

import { getCurriculumTreeAction } from "@/lib/actions/curriculum";
import { CourseManager } from "@/components/course/course-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Node = Record<string, unknown>;

export function CourseTab() {
  const [tree, setTree] = useState<Node[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getCurriculumTreeAction()
      .then((data) => {
        if (active) setTree(data as Node[]);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "Could not load courses.");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpenIcon className="size-4 text-muted-foreground" />
            Course modules &amp; topics
          </CardTitle>
          <CardDescription>
            Beginner, Pre-Intermediate, Intermediate, Advanced and Proficiency. Add or remove modules and topics for each course.
          </CardDescription>
        </CardHeader>
      </Card>
      {error ? (
        <Card><CardContent className="pt-6 text-sm text-destructive">{error}</CardContent></Card>
      ) : !tree ? (
        <Card><CardContent className="flex items-center gap-2 pt-6 text-sm text-muted-foreground"><LoaderCircleIcon className="size-4 animate-spin" />Loading courses...</CardContent></Card>
      ) : (
        <CourseManager tree={tree} />
      )}
    </div>
  );
}
