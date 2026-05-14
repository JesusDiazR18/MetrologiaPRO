'use client';

import { Toaster } from 'react-hot-toast';

export default function NotificationsProvider() {
  return (
    <Toaster
      position="bottom-center"
      toastOptions={{
        style: {
          background: '#fff',
          color: '#0f172a',
          boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)',
          borderRadius: '12px',
          border: '1px solid rgba(226, 232, 240, 0.8)',
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
