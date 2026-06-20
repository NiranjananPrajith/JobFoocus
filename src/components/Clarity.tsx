'use client';

import { useEffect } from 'react';
import Clarity from '@microsoft/clarity';

export default function ClarityTracker() {
  useEffect(() => {
    Clarity.init('x9q83k55lt');
  }, []);

  return null;
}
