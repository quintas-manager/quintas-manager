'use client'
import { useEffect, useState } from 'react'

export default function AppLoader() {
  const [show, setShow] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setShow(false), 800)
    return () => clearTimeout(t)
  }, [])

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-[9999]">
      <img src="/icons/icon-192x192.png" alt="Quintas Manager" className="w-28 h-28 mb-6" />
      <p className="text-gray-600 text-lg font-medium mb-8">Quintas Manager</p>
      <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
