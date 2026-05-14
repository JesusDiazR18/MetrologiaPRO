import React from 'react';
import SkeletonLoader from '@/components/SkeletonLoader';

export default function Loading() {
  // Un skeleton genérico de página
  return (
    <div className="page-fade-in" style={{ padding: '20px' }}>
      <SkeletonLoader type="table" />
    </div>
  );
}
