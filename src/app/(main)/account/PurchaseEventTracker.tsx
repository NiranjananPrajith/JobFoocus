'use client';

// PurchaseEventTracker — fires Meta Pixel Purchase event for dedup.
// Reads meta_purchase_event_id from the subscription row (set by the
// server webhook), fires the pixel, then clears the ID via an API call.

import { useEffect, useRef } from 'react';
import { fbqTrack } from '@/lib/meta-capi-client';
import type { Tier } from '@/lib/limits';
import type { Currency } from '@/lib/region';

interface PurchaseEventTrackerProps {
  metaPurchaseEventId: string | null;
  tier: Tier;
  currency: Currency;
}

export default function PurchaseEventTracker({
  metaPurchaseEventId,
  tier,
  currency,
}: PurchaseEventTrackerProps) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!metaPurchaseEventId || firedRef.current) return;
    firedRef.current = true;

    // Fire the pixel event with dedup event_id
    fbqTrack(metaPurchaseEventId, 'Purchase', {
      currency,
      value: 0, // value is sent via CAPI; pixel value can be 0 for dedup
      content_name: tier,
    });

    // Clear the event_id so it doesn't fire again
    fetch('/api/db/subscriptions/clear-purchase-event-id', {
      method: 'POST',
    }).catch(() => {
      // Silently fail — the event was already fired; worst case it
      // fires again on next page load, which Meta will dedup.
    });
  }, [metaPurchaseEventId, tier, currency]);

  return null;
}
