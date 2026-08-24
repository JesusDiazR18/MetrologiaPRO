import type { Metadata } from 'next'
import './globals.css'
import AppLayout from '@/components/AppLayout'
import NotificationsProvider from '@/components/NotificationsProvider'
import { AuthProvider } from '@/components/AuthProvider'

export const metadata: Metadata = {
  title: 'Sistema de Control Metrológico PRO',
  description: 'Gestión profesional de instrumentos, equipos y patrones de referencia - ISO 9001:2015',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0ea5e9" />
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body>
        <AuthProvider>
          <NotificationsProvider />
          <AppLayout>{children}</AppLayout>
        </AuthProvider>
      </body>
    </html>
  )
}
