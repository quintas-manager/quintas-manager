"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, CalendarPlus, Clock, Receipt, Wallet, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTIONS = [
  { label: "Nueva Reserva",     icon: CalendarPlus, href: "/reservas/nueva",     color: "text-green-600" },
  { label: "Reserva Pendiente", icon: Clock,        href: "/reservas/pendiente", color: "text-amber-500" },
  { label: "Agregar Gasto",     icon: Receipt,      href: "/gastos/nueva",       color: "text-gray-700" },
  { label: "Registrar Pago",    icon: Wallet,       href: "/pagos/nueva",        color: "text-gray-700" },
] as const;

export function FloatingActionButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      {/* Full-screen overlay — covers app, sits below FAB */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-white/95 transition-opacity duration-200",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* FAB container — above overlay */}
      <div ref={ref} className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3">
        {/* Action items */}
        {ACTIONS.map((action, i) => {
          const Icon = action.icon;
          return (
            <div
              key={action.href}
              className={cn(
                "flex items-center gap-2 transition-all duration-200",
                open
                  ? "translate-y-0 opacity-100"
                  : "translate-y-4 opacity-0 pointer-events-none",
              )}
              style={{ transitionDelay: open ? `${i * 40}ms` : "0ms" }}
            >
              <span className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white shadow-md whitespace-nowrap">
                {action.label}
              </span>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push(action.href);
                }}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-md border border-gray-200 hover:bg-gray-50 transition",
                  action.color,
                )}
                aria-label={action.label}
              >
                <Icon className="h-5 w-5" />
              </button>
            </div>
          );
        })}

        {/* Main button */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Cerrar menú" : "Acciones rápidas"}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200",
            open
              ? "bg-gray-700 text-white rotate-45"
              : "bg-gray-900 text-white hover:bg-gray-700",
          )}
        >
          {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </button>
      </div>
    </>
  );
}
