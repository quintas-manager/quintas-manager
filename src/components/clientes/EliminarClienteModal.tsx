'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, X } from 'lucide-react'
import { eliminarCliente } from '@/lib/actions/clientes'

interface Props {
  clienteId: string
  nombre: string
  apellido: string
  reservasCount: number
  variant?: 'icon' | 'button'
  redirectOnDelete?: string
}

export function EliminarClienteModal({
  clienteId,
  nombre,
  apellido,
  reservasCount,
  variant = 'icon',
  redirectOnDelete,
}: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleEliminar() {
    setError(null)
    startTransition(async () => {
      try {
        await eliminarCliente(clienteId)
        setOpen(false)
        if (redirectOnDelete) {
          router.push(redirectOnDelete)
        } else {
          router.refresh()
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al eliminar')
      }
    })
  }

  return (
    <>
      {variant === 'icon' ? (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true) }}
          className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 transition"
          title="Eliminar cliente"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition min-h-[44px]"
        >
          <Trash2 className="h-4 w-4" />
          Eliminar cliente
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-base font-semibold text-gray-900 pr-6">
              ¿Eliminar a {nombre} {apellido}?
            </h2>

            {reservasCount > 0 ? (
              <>
                <p className="mt-3 text-sm text-gray-600">
                  Este cliente tiene{' '}
                  <span className="font-medium">{reservasCount}</span>{' '}
                  {reservasCount === 1 ? 'reserva asociada' : 'reservas asociadas'} y no puede
                  eliminarse. Eliminá primero sus reservas desde el módulo de Reservas.
                </p>
                <div className="mt-5 flex justify-end">
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition"
                  >
                    Cerrar
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm text-gray-500">
                  Esta acción no se puede deshacer.
                </p>
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                <div className="mt-5 flex justify-end gap-3">
                  <button
                    onClick={() => setOpen(false)}
                    disabled={pending}
                    className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleEliminar}
                    disabled={pending}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {pending ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
