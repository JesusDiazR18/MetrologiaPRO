'use client';

import { Toaster } from 'react-hot-toast';

export default function NotificationsProvider() {
  return (
    <Toaster
      // Arriba: abajo tapaba los botones de acción de los modales y la barra inferior móvil.
      position="top-center"
      containerStyle={{ top: 14 }}
      toastOptions={{
        // Tokens del tema: legible en modo claro y oscuro.
        style: {
          background: 'var(--card-bg)',
          color: 'var(--text-main)',
          boxShadow: '0 12px 32px -10px rgba(2, 6, 23, 0.35)',
          borderRadius: '12px',
          border: '1px solid var(--border-field)',
          fontSize: '14px',
          fontWeight: 600,
          padding: '12px 20px',
        },
        success: {
          iconTheme: {
            primary: '#10b981',
            secondary: '#fff',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
        },
      }}
    />
  );
}
