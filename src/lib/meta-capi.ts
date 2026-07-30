// lib/meta-capi.ts
//
// Server-side Meta Conversions API (CAPI) sender. Fire-and-forget —
// never blocks business logic. Errors are logged with [meta-capi] prefix.
//
// Requires META_ACCESS_TOKEN env var (from Meta Events Manager).

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '';
const GRAPH_URL = PIXEL_ID ? `https://graph.facebook.com/v21.0/${PIXEL_ID}/events` : '';


/** Lowercase + SHA-256 hash for Meta user_data fields (email). */
export async function hashData(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.toLowerCase().trim());
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Extract event_source_url from request headers. */
export function getEventSourceUrl(request: Request): string {
  const url = new URL(request.url);
  return url.origin + url.pathname;
}

interface CAPIEventParams {
  /** Meta event name (e.g. 'Purchase', 'CompleteRegistration'). */
  eventName: string;
  /** Our event_id for deduplication between browser pixel and server CAPI. */
  eventId: string;
  /** Event timestamp as Unix seconds. */
  eventTime: number;
  /** Event source URL. */
  eventSourceUrl: string;
  /** Client IP from request headers. */
  clientIpAddress: string;
  /** Client User-Agent from request headers. */
  clientUserAgent: string;
  /** User data (email hash, external_id). */
  userData?: {
    email?: string;
    externalId?: string;
  };
  /** Custom data (currency, value, content_name, etc.). */
  customData?: Record<string, unknown>;
}

/**
 * Send a CAPI event to Meta's Graph API. Fire-and-forget — logs errors
 * but never throws.
 */
export async function sendMetaCAPIEvent(params: CAPIEventParams): Promise<void> {
  const accessToken = process.env.META_ACCESS_TOKEN;
  if (!PIXEL_ID || !accessToken) {
    console.warn('[meta-capi] META_ACCESS_TOKEN or NEXT_PUBLIC_META_PIXEL_ID not set, skipping event');
    return;
  }

  const userData: Record<string, unknown> = {
    client_ip_address: params.clientIpAddress,
    client_user_agent: params.clientUserAgent,
  };

  if (params.userData?.email) {
    userData.em = [await hashData(params.userData.email)];
  }
  if (params.userData?.externalId) {
    userData.external_id = params.userData.externalId;
  }

  const payload = {
    data: [
      {
        event_name: params.eventName,
        event_time: params.eventTime,
        event_source_url: params.eventSourceUrl,
        event_id: params.eventId,
        action_source: 'website',
        user_data: userData,
        ...(params.customData ? { custom_data: params.customData } : {}),
      },
    ],
  };

  try {
    const res = await fetch(`${GRAPH_URL}?access_token=${accessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[meta-capi] ${params.eventName} failed (${res.status}):`, body);
    }
  } catch (err) {
    console.error(`[meta-capi] ${params.eventName} request error:`, err);
  }
}
