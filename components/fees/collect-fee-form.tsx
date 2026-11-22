"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { LoaderCircleIcon } from "lucide-react";

import { collectPaymentAction } from "@/lib/actions/fees";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatPKR } from "@/lib/format";

type FeeRecordRow = Record<string, unknown>;
type Props = {
  student: { id: string; full_name: string; student_code: string; phone: string };
  records: FeeRecordRow[];
};

export function CollectFeeForm({ student, records }: Props) {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string[]>(records.map((r) => String(r.id)));
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<string>("cash");
  const [paidOn, setPaidOn] = useState<string>(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [receipt, setReceipt] = useState<string | null>(null);

  const selectedRecords = records.filter((r) => selected.includes(String(r.id)));
  const balance = selectedRecords.reduce((s, r) => s + Math.max(0, Number(r.amount_due) - Number(r.discount) - Number(r.amount_paid)), 0);

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  }

  function submit() {
    setReceipt(null);
    const amt = Number(amount);
    if (!selected.length) {
      toast.error("Select at least one fee record.");
      return;
    }
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    startTransition(async () => {
      const result = await collectPaymentAction({
        student_id: student.id,
        fee_record_ids: selected,
        amount: amt,
        method: method as "cash" | "bank_transfer" | "jazzcash" | "easypaisa" | "card" | "other",
        paid_on: paidOn,
        reference,
        note,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setReceipt(result.data.receiptNo);
      toast.success(result.message ?? "Payment recorded");
    });
  }

  const waText = encodeURIComponent(`Dear ${student.full_name}, we received your payment at Sir Sahil's English Language Centre. Receipt: ${receipt ?? ""}. Thank you.`);
  const waPhone = String(student.phone ?? "").replace(/\D/g, "");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Collect from {student.full_name} <span className="text-muted-foreground text-sm">({student.student_code})</span></CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="p-2 text-left">Select</th><th className="p-2 text-left">Month</th><th className="p-2 text-left">Due</th><th className="p-2 text-left">Paid</th><th className="p-2 text-left">Balance</th><th className="p-2 text-left">Status</th></tr></thead>
            <tbody>
              {records.length === 0 ? <tr><td colSpan={6} className="p-3 text-muted-foreground">No pending fee records for this student.</td></tr> :
                records.map((r) => {
                  const id = String(r.id);
                  const bal = Math.max(0, Number(r.amount_due) - Number(r.discount) - Number(r.amount_paid));
                  return (
                    <tr key={id} className="border-t">
                      <td className="p-2"><Checkbox checked={selected.includes(id)} onCheckedChange={(v) => toggle(id, Boolean(v))} /></td>
                      <td className="p-2">{String(r.period_month).slice(0, 7)}</td>
                      <td className="p-2">{formatPKR(Number(r.amount_due))}</td>
                      <td className="p-2">{formatPKR(Number(r.amount_paid))}</td>
                      <td className="p-2 font-medium">{formatPKR(bal)}</td>
                      <td className="p-2"><Badge variant="outline" className="capitalize">{String(r.status)}</Badge></td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label>Amount received (PKR)</Label><Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(balance)} /></div>
          <div className="space-y-2"><Label>Payment method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v ?? "cash")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem><SelectItem value="jazzcash">JazzCash</SelectItem><SelectItem value="easypaisa">Easypaisa</SelectItem><SelectItem value="bank_transfer">Bank transfer</SelectItem><SelectItem value="card">Card</SelectItem><SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Payment date</Label><Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></div>
          <div className="space-y-2"><Label>Reference / transaction no.</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Note</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={submit} disabled={isPending || records.length === 0}>{isPending && <LoaderCircleIcon className="size-4 animate-spin" />}Record payment</Button>
          <Button type="button" variant="outline" onClick={() => setAmount(String(balance))}>Fill full balance ({formatPKR(balance)})</Button>
        </div>

        {receipt && (
          <div className="rounded-lg border border-success/30 bg-success/5 p-4 text-sm space-y-2">
            <p className="font-medium text-success">Payment recorded. Receipt: {receipt}</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>Print receipt</Button>
              {waPhone && <Button nativeButton={false} variant="outline" size="sm" render={<a href={`https://wa.me/${waPhone}?text=${waText}`} target="_blank" rel="noreferrer" />}>Share on WhatsApp</Button>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
