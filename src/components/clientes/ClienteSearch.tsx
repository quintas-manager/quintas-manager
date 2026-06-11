"use client";

import { useEffect, useRef, useState } from "react";
import { Search, UserPlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { NuevoClienteModal } from "@/components/reservas/NuevoClienteModal";

export interface ClienteOption {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  dni?: string | null;
}

interface ClienteSearchProps {
  value: string;
  onChange: (id: string) => void;
  initialClientes?: ClienteOption[];
  error?: string;
  placeholder?: string;
}

export function ClienteSearch({
  value,
  onChange,
  initialClientes = [],
  error,
  placeholder = "Buscar por nombre, teléfono o DNI...",
}: ClienteSearchProps) {
  const [clientes, setClientes]     = useState<ClienteOption[]>(initialClientes);
  const [search, setSearch]         = useState("");
  const [open, setOpen]             = useState(false);
  const [fetching, setFetching]     = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const containerRef                = useRef<HTMLDivElement>(null);

  const selected = clientes.find((c) => c.id === value) ?? null;

  // Debounced API search
  useEffect(() => {
    if (!search.trim()) {
      setClientes(initialClientes);
      return;
    }
    const t = setTimeout(async () => {
      setFetching(true);
      try {
        const res  = await fetch(`/api/clientes?q=${encodeURIComponent(search)}`);
        const data = await res.json();
        setClientes(Array.isArray(data) ? data : []);
      } finally {
        setFetching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  // Outside click closes dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-900">
            {selected.nombre} {selected.apellido}
          </p>
          <p className="text-xs text-gray-500">{selected.telefono}</p>
        </div>
        <button
          type="button"
          onClick={() => { onChange(""); setSearch(""); }}
          className="text-xs text-gray-400 hover:text-gray-600 transition"
        >
          Cambiar
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition"
        >
          <UserPlus className="h-4 w-4" />
          + Nuevo cliente
        </button>

        <div ref={containerRef} className="relative">
          <p className="text-xs text-gray-500 mb-1.5">O buscar cliente existente</p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              placeholder={placeholder}
              className={cn(
                "w-full rounded-lg border py-2 pl-9 pr-9 text-sm outline-none transition focus:ring-2 focus:ring-offset-0",
                error
                  ? "border-red-400 focus:ring-red-200"
                  : "border-gray-300 focus:border-gray-400 focus:ring-gray-200"
              )}
            />
            {fetching && (
              <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
            )}
          </div>

          {open && (
            <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
              <div className="max-h-52 overflow-y-auto">
                {clientes.length === 0 && !fetching && (
                  <p className="px-4 py-3 text-sm text-gray-400">Sin resultados</p>
                )}
                {clientes.slice(0, 8).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { onChange(c.id); setOpen(false); setSearch(""); }}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left transition hover:bg-gray-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {c.nombre} {c.apellido}
                      </p>
                      <p className="text-xs text-gray-500">{c.telefono}</p>
                    </div>
                    {c.dni && <span className="text-xs text-gray-400">{c.dni}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
      </div>

      {showModal && (
        <NuevoClienteModal
          onClose={() => setShowModal(false)}
          onSuccess={(nuevo) => {
            setClientes((prev) => [nuevo as ClienteOption, ...prev]);
            onChange(nuevo.id);
            setShowModal(false);
          }}
        />
      )}
    </>
  );
}
