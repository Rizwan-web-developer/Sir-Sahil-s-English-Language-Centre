import {
  Award,
  BookMarked,
  BookOpen,
  CalendarDays,
  ChartColumn,
  ClipboardCheck,
  GraduationCap,
  House,
  IdCard,
  Layers,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  Receipt,
  ScanLine,
  ScrollText,
  Settings,
  Trophy,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { t } from "@/lib/i18n";
import type { UserRole } from "@/types/domain";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Only highlight on an exact match (used for dashboards). */
  exact?: boolean;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export type StaffArea = "admin" | "owner";

/** Navigation for the Teacher panel and Admin Management panel. */
export function getStaffNav(role: UserRole, area: StaffArea): NavGroup[] {
  if (area === "owner") {
    return [
      {
        label: t.nav.teachingGroup,
        items: [
          { label: t.nav.overview, href: "/owner", icon: LayoutDashboard, exact: true },
          { label: t.nav.teaching, href: "/owner/teaching", icon: GraduationCap },
          { label: "Curriculum", href: "/owner/curriculum", icon: BookMarked },
          { label: t.nav.assignments, href: "/owner/assignments", icon: ClipboardCheck },
          { label: t.nav.rankings, href: "/owner/rankings", icon: Trophy },
          { label: t.nav.certificates, href: "/owner/certificates", icon: Award },
        ],
      },
      {
        label: t.nav.systemGroup,
        items: [{ label: t.nav.account, href: "/owner/account", icon: UserRound }],
      },
    ];
  }

  const managementItems: NavItem[] = [
    { label: t.nav.dashboard, href: "/admin", icon: LayoutDashboard, exact: true },
    { label: t.nav.students, href: "/admin/students", icon: Users },
    { label: t.nav.batches, href: "/admin/batches", icon: Layers },
    { label: t.nav.attendance, href: "/admin/attendance", icon: ScanLine },
    { label: t.nav.fees, href: "/admin/fees", icon: Wallet },
    { label: "Announcements", href: "/admin/announcements", icon: Megaphone },
    { label: t.nav.reports, href: "/admin/reports", icon: ChartColumn },
  ];

  const systemItems: NavItem[] = [
    { label: t.nav.settings, href: "/admin/settings", icon: Settings },
  ];
  if (role === "owner") {
    systemItems.push({ label: "Audit log", href: "/admin/audit-log", icon: ScrollText });
  }
  systemItems.push({ label: t.nav.account, href: "/admin/account", icon: UserRound });

  return [
    { label: t.nav.workspace, items: managementItems },
    { label: t.nav.systemGroup, items: systemItems },
  ];
}

export const portalTabs: NavItem[] = [
  { label: t.nav.home, href: "/portal", icon: House, exact: true },
  { label: t.nav.attendance, href: "/portal/attendance", icon: CalendarDays },
  { label: t.nav.course, href: "/portal/progress", icon: BookOpen },
  { label: t.nav.fees, href: "/portal/fees", icon: Receipt },
  { label: t.nav.more, href: "/portal/more", icon: ListChecks },
];

export const portalMoreLinks: NavItem[] = [
  { label: "My ID Card", href: "/portal/id-card", icon: IdCard },
  { label: t.nav.timetable, href: "/portal/timetable", icon: CalendarDays },
  { label: t.nav.assignments, href: "/portal/assignments", icon: ClipboardCheck },
  { label: t.nav.certificates, href: "/portal/certificates", icon: Award },
  { label: "Announcements", href: "/portal/announcements", icon: Megaphone },
  { label: t.nav.account, href: "/portal/account", icon: UserRound },
];

export function isNavActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Longest matching nav label for the topbar title. */
export function findNavTitle(pathname: string, groups: NavGroup[]): string | undefined {
  let best: NavItem | undefined;

  for (const group of groups) {
    for (const item of group.items) {
      if (isNavActive(pathname, item)) {
        if (!best || item.href.length > best.href.length) best = item;
      }
    }
  }

  return best?.label;
}
