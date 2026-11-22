"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createProfileChangeRequestAction } from "@/lib/actions/profile-requests";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export function ProfileChangeRequest() {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const res = await createProfileChangeRequestAction({ message });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success(res.message ?? "Request sent");
      setMessage("");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request profile change</CardTitle>
        <CardDescription>If your phone, name, or other details need updating, send a request to reception.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Example: Please update my phone number to 03..." />
        <Button onClick={submit} disabled={isPending}>Send request</Button>
      </CardContent>
    </Card>
  );
}
