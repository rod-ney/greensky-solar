import {
  LayoutDashboard,
  FolderKanban,
  ShieldCheck,
  Calendar,
  ClipboardList,
  Users,
  UserCog,
  FileBarChart,
  Package,
  Receipt,
  Bell,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  {
    label: "Dashboard",
    description: "View key metrics and overall activity.",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Bookings",
    description: "Manage customer appointments and schedules.",
    href: "/bookings",
    icon: ClipboardList,
  },
  {
    label: "Projects",
    description: "Track project progress and milestones.",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    label: "Calendar",
    description: "See upcoming tasks and planned events.",
    href: "/calendar",
    icon: Calendar,
  },
  {
    label: "After Sales",
    description: "Handle support and post-installation care.",
    href: "/after-sales",
    icon: ShieldCheck,
  },
  {
    label: "Technicians",
    description: "Monitor technician assignments and status.",
    href: "/technicians",
    icon: Users,
  },
  {
    label: "Inventory",
    description: "Review stock levels and item availability.",
    href: "/inventory",
    icon: Package,
  },
  {
    label: "Invoice",
    description: "Create and manage billing records.",
    href: "/invoice",
    icon: Receipt,
  },
  {
    label: "Reports",
    description: "Analyze performance and business insights.",
    href: "/reports",
    icon: FileBarChart,
  },
  {
    label: "Notifications",
    description: "Check alerts and recent updates.",
    href: "/notifications",
    icon: Bell,
  },
  {
    label: "User Management",
    description: "Control user roles and account access.",
    href: "/users",
    icon: UserCog,
  },
];
