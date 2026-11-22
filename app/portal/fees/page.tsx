import type { Metadata } from "next";
import { ReceiptIcon, WalletIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireStudent } from "@/lib/auth/session";
import { getPortalFees } from "@/lib/data/portal";
import { formatDate, formatMonth, formatPKR } from "@/lib/format";
import { t } from "@/lib/i18n";
import { getSettings, settingString } from "@/lib/settings";
import { cn } from "@/lib/utils";
import type { FeeStatus } from "@/types/domain";

export const metadata: Metadata = { title: "Fees" };

const FEE_BADGES: Record<FeeStatus, string> = {
  pending: "border-gold/40 bg-gold/10 text-gold-foreground dark:text-gold",
  partial: "border-gold/40 bg-gold/10 text-gold-foreground dark:text-gold",
  paid: "border-success/30 bg-success/10 text-success",
  waived: "border-border bg-muted text-muted-foreground",
  overdue: "border-destructive/30 bg-destructive/10 text-destructive",
};

export default async function PortalFeesPage() {
  const { profile } = await requireStudent();
  const [fees, settings] = await Promise.all([getPortalFees(profile.id), getSettings()]);
  const jazzcash = settingString(settings, "payment_jazzcash", "");
  const easypaisa = settingString(settings, "payment_easypaisa", "");
  const bank = settingString(settings, "payment_bank", "");

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t.nav.portalGroup}
        title={t.nav.fees}
        description="Your monthly invoice, payments and receipts."
      />

      <div className="grid grid-cols-2 gap-3">
        <Card className="gap-1 py-4">
          <CardContent className="px-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t.fees.totalOutstanding}
            </p>
            <p
              className={cn(
                "font-heading text-2xl font-semibold",
                fees.totalDue > 0 && "text-destructive",
              )}
            >
              {formatPKR(fees.totalDue)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {fees.records.length} invoice{fees.records.length === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>
        <Card className="gap-1 py-4">
          <CardContent className="px-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t.fees.lifetimePaid}
            </p>
            <p className="font-heading text-2xl font-semibold text-success">
              {formatPKR(fees.totalPaid)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {t.fees.monthlyFee}: {formatPKR(fees.monthlyFee)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">How to pay</CardTitle>
          <CardDescription>Use these institute payment details. Reception will confirm your payment and issue a receipt.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg border bg-muted/20 p-3"><p className="text-xs font-medium text-muted-foreground">JazzCash</p><p className="mt-1 whitespace-pre-wrap">{jazzcash || "Contact reception"}</p></div>
          <div className="rounded-lg border bg-muted/20 p-3"><p className="text-xs font-medium text-muted-foreground">Easypaisa</p><p className="mt-1 whitespace-pre-wrap">{easypaisa || "Contact reception"}</p></div>
          <div className="rounded-lg border bg-muted/20 p-3"><p className="text-xs font-medium text-muted-foreground">Bank</p><p className="mt-1 whitespace-pre-wrap">{bank || "Contact reception"}</p></div>
        </CardContent>
      </Card>

      {fees.records.length === 0 ? (
        <EmptyState
          icon={WalletIcon}
          title={t.empty.feesTitle}
          description="Reception generates your monthly invoice on the 1st. It will appear here with every receipt."
        />
      ) : (
        <div className="space-y-3">
          {fees.records.map((record) => (
            <Card key={record.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <ReceiptIcon className="size-4 text-muted-foreground" />
                      {formatMonth(record.period_month)}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {t.fees.dueDate}: {formatDate(record.due_date)}
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("capitalize", FEE_BADGES[record.status])}
                  >
                    {t.feeStatus[record.status]}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {t.fees.amountDue}
                    </dt>
                    <dd className="font-medium tabular-nums">
                      {formatPKR(record.amount_due)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {t.fees.discount}
                    </dt>
                    <dd className="font-medium tabular-nums">
                      {formatPKR(record.discount)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {t.fees.paid}
                    </dt>
                    <dd className="font-medium tabular-nums">
                      {formatPKR(record.amount_paid)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {t.fees.balance}
                    </dt>
                    <dd
                      className={cn(
                        "font-semibold tabular-nums",
                        record.balance > 0
                          ? "text-destructive"
                          : "text-success",
                      )}
                    >
                      {formatPKR(record.balance)}
                    </dd>
                  </div>
                </dl>

                <div className="space-y-2 border-t pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t.fees.receipts}
                  </p>
                  {record.payments.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">
                      {t.fees.noPayments}
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {record.payments.map((payment) => (
                        <li
                          key={payment.id}
                          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border bg-background/60 px-2.5 py-2 text-[11px]"
                        >
                          <span className="font-medium tabular-nums">
                            {formatPKR(payment.amount)}
                          </span>
                          <span className="text-muted-foreground">
                            {t.paymentMethod[payment.method]}
                          </span>
                          <span className="text-muted-foreground">
                            {formatDate(payment.paid_on)}
                          </span>
                          {payment.receipt_no && (
                            <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                              {payment.receipt_no}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
