import React from 'react';

export default function SkeletonLoader({ type = 'table' }: { type?: 'table' | 'cards' | 'chart' | 'dashboard' }) {
  if (type === 'table') {
    return (
      <div className="skeleton-container" style={{ padding: '20px' }}>
        <div className="skeleton-line" style={{ height: 40, width: '100%', marginBottom: 15, borderRadius: 8 }}></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton-line" style={{ height: 60, width: '100%', marginBottom: 10, borderRadius: 8 }}></div>
        ))}
      </div>
    );
  }

  if (type === 'cards') {
    return (
      <div className="grid-adaptive" style={{ padding: '20px' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton-line" style={{ height: 180, borderRadius: 12 }}></div>
        ))}
      </div>
    );
  }

  if (type === 'dashboard') {
    return (
      <div>
        <div className="kpi-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton-line" style={{ height: 120, borderRadius: 16 }}></div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 24, marginTop: 24 }}>
          <div className="skeleton-line" style={{ height: 400, borderRadius: 16 }}></div>
          <div className="skeleton-line" style={{ height: 400, borderRadius: 16 }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="skeleton-line" style={{ height: 200, width: '100%', borderRadius: 12 }}></div>
  );
}
