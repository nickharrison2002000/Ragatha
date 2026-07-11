import React from 'react';
import { Navigate, useNavigate, Outlet } from 'react-router-dom';
import SuiteSidebar from '@/components/suite/SuiteSidebar';

export default function Suite() {
  const navigate = useNavigate();
  const tier = localStorage.getItem('ragatha_tier');
  const modelName = localStorage.getItem('ragatha_model') || 'Ragatha.gguf';

  if (!tier) return <Navigate to="/" replace />;

  const handleEject = () => {
    localStorage.removeItem('ragatha_tier');
    localStorage.removeItem('ragatha_model');
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <SuiteSidebar tier={tier} modelName={modelName} onEject={handleEject} />
      <main className="flex-1 flex flex-col min-w-0">
        <Outlet context={{ tier }} />
      </main>
    </div>
  );
}
