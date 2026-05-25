'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ConditionalChromeProps {
  children: React.ReactNode;
}

export default function ConditionalChrome({ children }: ConditionalChromeProps) {
  const [isPopup, setIsPopup] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsPopup(pathname === '/popup');
  }, [pathname]);

  if (isPopup) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Will be rendered by root layout */}
    </>
  );
}