'use client';

import { useEffect } from 'react';
import Clarity from '@microsoft/clarity';

const CLARITY_ID = process.env.NEXT_PUBLIC_MICROSOFT_CLARITY_ID;

export default function ClarityTracker() {
  useEffect(() => {
    if (CLARITY_ID) {
      Clarity.init(CLARITY_ID);
    }
  }, []);

  return null;
}

