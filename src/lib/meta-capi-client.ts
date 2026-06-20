// lib/meta-capi-client.ts
//
// Client-side Meta Pixel helpers. Assumes window.fbq exists (loaded by
// MetaPixel component). No-ops if fbq is not available (SSR safety).

/**
 * Fire a standard Meta Pixel event with an event_id for deduplication.
 * @param eventId - Shared event_id between browser pixel and server CAPI
 * @param eventName - Meta event name (e.g. 'Purchase', 'CompleteRegistration')
 * @param params - Optional custom parameters for the event
 */
export function fbqTrack(
  eventId: string,
  eventName: string,
  params?: Record<string, unknown>
): void {
  if (typeof window === 'undefined' || !window.fbq) return;
  // fbq('track', eventName, params, { eventID })
  window.fbq('track', eventName, params ?? {}, { eventID: eventId });
}

/**
 * Fire a custom Meta Pixel event with an event_id for deduplication.
 * @param eventId - Shared event_id between browser pixel and server CAPI
 * @param eventName - Custom event name
 * @param params - Optional custom parameters for the event
 */
export function fbqTrackCustom(
  eventId: string,
  eventName: string,
  params?: Record<string, unknown>
): void {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq('trackCustom', eventName, params ?? {}, { eventID: eventId });
}
