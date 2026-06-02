"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/app/(dashboard)/actions";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",     href: "/dashboard",     icon: LayoutDashboard },
  { label: "Calendario",    href: "/calendario",    icon: CalendarDays },
  { label: "Reservas",      href: "/reservas",      icon: BookOpen },
  { label: "Finanzas",      href: "/finanzas",      icon: BarChart3 },
  { label: "Clientes",      href: "/clientes",      icon: Users },
  { label: "Limpieza",      href: "/limpieza",      icon: Sparkles },
  { label: "Configuración", href: "/configuracion", icon: Settings, adminOnly: true },
];

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":     "Dashboard",
  "/calendario":    "Calendario",
  "/reservas":      "Reservas",
  "/finanzas":      "Finanzas",
  "/gastos":        "Gastos",
  "/clientes":      "Clientes",
  "/limpieza":      "Limpieza",
  "/configuracion": "Configuración",
};

function resolveTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const base = "/" + pathname.split("/")[1];
  return PAGE_TITLES[base] ?? "Quintas Manager";
}

function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
        active
          ? "bg-white/10 text-white"
          : "text-gray-400 hover:bg-white/5 hover:text-white"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          active ? "text-white" : "text-gray-500 group-hover:text-gray-300"
        )}
      />
      <span>{item.label}</span>
      {active && <ChevronRight className="ml-auto h-3.5 w-3.5 text-gray-500" />}
    </Link>
  );
}

interface SidebarInnerProps {
  userName: string;
  userRole: string;
  pathname: string;
  onClose?: () => void;
}

function SidebarInner({ userName, userRole, pathname, onClose }: SidebarInnerProps) {
  const isAdmin = userRole === "ADMIN";
  const items = NAV_ITEMS.filter((i) => !i.adminOnly || isAdmin);

  return (
    <div className="flex h-full flex-col bg-gray-900">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-[18px]">
        <div className="flex gap-1.5">
          <span className="block h-5 w-[5px] rounded-full bg-[#16a34a]" />
          <span className="block h-5 w-[5px] rounded-full bg-[#2563eb]" />
        </div>
        <span className="flex-1 text-sm font-bold tracking-tight text-white">
          Quintas Manager
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-white/10 hover:text-white"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {items.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={pathname === item.href || pathname.startsWith(item.href + "/")}
            onClick={onClose}
          />
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/10 px-4 py-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-700 text-sm font-semibold text-white select-none">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{userName}</p>
            <p className="text-xs text-gray-500">
              {isAdmin ? "Administrador" : "Operador"}
            </p>
          </div>
        </div>

        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}

interface DashboardShellProps {
  userName: string;
  userRole: string;
  children: React.ReactNode;
}

export function DashboardShell({ userName, userRole, children }: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ── Desktop sidebar ─────────────────────────────────────── */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col">
        <SidebarInner userName={userName} userRole={userRole} pathname={pathname} />
      </aside>

      {/* ── Mobile drawer ───────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 w-72 shadow-2xl">
            <SidebarInner
              userName={userName}
              userRole={userRole}
              pathname={pathname}
              onClose={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* ── Main content ────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="inline-flex items-center justify-center rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-semibold text-gray-900 lg:text-base">
            {resolveTitle(pathname)}
          </h1>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
