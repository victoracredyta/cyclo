import type { ReactNode } from 'react'
import { Toaster } from 'sonner'

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[#F6F8FB] antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
