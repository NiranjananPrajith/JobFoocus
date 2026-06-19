'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function JobsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-[14px] text-muted">Redirecting to dashboard…</div>
    </div>
  );
}
