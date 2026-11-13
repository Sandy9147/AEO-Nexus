'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CustomerRootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('aeo_access_token');
    if (!token) {
      router.replace('/login');
    } else {
      router.replace('/dashboard');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#3563F6] to-[#6554E8] flex items-center justify-center text-white font-bold text-lg shadow-sm animate-pulse">
          N
        </div>
        <p className="text-sm font-medium text-slate-500">Connecting to AEO Nexus Workspace...</p>
      </div>
    </div>
  );
}
