import React from 'react';
import { FileQuestion, AlertCircle, ScanLine } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: 'search' | 'alert' | 'scan';
  actionButton?: React.ReactNode;
}

export default function EmptyState({ title, description, icon = 'search', actionButton }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 20px',
      background: 'rgba(255,255,255,0.5)',
      backdropFilter: 'blur(10px)',
      borderRadius: '24px',
      border: '1px dashed #cbd5e1',
      textAlign: 'center',
      margin: '20px auto',
      maxWidth: '500px'
    }}>
      <div style={{
        background: '#f1f5f9',
        padding: '20px',
        borderRadius: '50%',
        marginBottom: '20px',
        color: '#94a3b8'
      }}>
        {icon === 'search' && <FileQuestion size={48} />}
        {icon === 'alert' && <AlertCircle size={48} />}
        {icon === 'scan' && <ScanLine size={48} />}
      </div>
      <h3 style={{ fontSize: '20px', color: '#334155', marginBottom: '8px', fontWeight: 700 }}>{title}</h3>
      <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.6, marginBottom: actionButton ? '24px' : '0' }}>
        {description}
      </p>
      {actionButton && <div>{actionButton}</div>}
    </div>
  );
}
