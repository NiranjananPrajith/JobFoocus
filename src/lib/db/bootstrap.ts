// src/lib/db/bootstrap.ts
// First-load migration: pushes existing localStorage data to Supabase
// Runs once per user on first authenticated load after this update deploys

import { createClient as createBrowserClient } from '@/lib/supabase/client'

async function getUserId(): Promise<string | null> {
  const supabase = createBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

async function apiFetch(path: string, options?: RequestInit): Promise<any> {
  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `API error ${res.status}`)
  }
  return res.json()
}

async function localExport(): Promise<Record<string, unknown>> {
  if (typeof window === 'undefined') return {}
  const storage = window.chrome?.storage?.local ?? null
  if (storage) {
    return new Promise((resolve) => {
      storage.get(null, (allData: Record<string, unknown>) => resolve(allData as Record<string, unknown>))
    })
  }
  if (typeof localStorage !== 'undefined') {
    const data: Record<string, unknown> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        try { data[key] = JSON.parse(localStorage.getItem(key) ?? 'null') }
        catch { data[key] = localStorage.getItem(key) }
      }
    }
    return data
  }
  return {}
}

export async function bootstrapFromLocalStorage(_userId?: string): Promise<{ migrated: number }> {
  const userId = _userId ?? await getUserId()
  if (!userId) return { migrated: 0 }

  // Already migrated? check via API
  try {
    const rows = await apiFetch('/api/db/applications')
    if (rows && rows.length > 0) return { migrated: 0 }
  } catch {
    return { migrated: 0 }
  }

  const localBackup = await localExport()
  if (Object.keys(localBackup).length === 0) return { migrated: 0 }

  const applications = localBackup['applications'] as Record<string, unknown> | undefined
  if (applications) {
    for (const [key, value] of Object.entries(applications)) {
      const slashIdx = key.indexOf('/')
      if (slashIdx === -1) continue
      const category = key.slice(0, slashIdx)
      const folder = key.slice(slashIdx + 1)
      try {
        await apiFetch('/api/db/applications', {
          method: 'POST',
          body: JSON.stringify({ category, folder, appData: value }),
        })
      } catch (e) {
        console.warn('[bootstrap] failed to migrate application:', key, e)
      }
    }
  }

  for (const [key, html] of Object.entries(localBackup)) {
    if (!key.startsWith('doc_') || typeof html !== 'string') continue
    const remainder = key.slice(4)
    const lastSlash = remainder.lastIndexOf('/')
    if (lastSlash === -1) continue
    const docType = remainder.slice(lastSlash + 1)
    const path = remainder.slice(0, lastSlash)
    const slashIdx = path.indexOf('/')
    if (slashIdx === -1) continue
    const category = path.slice(0, slashIdx)
    const folder = path.slice(slashIdx + 1)
    try {
      await apiFetch('/api/db/documents', {
        method: 'POST',
        body: JSON.stringify({ category, folder, docType, html }),
      })
    } catch (e) {
      console.warn('[bootstrap] failed to migrate document:', key, e)
    }
  }

  const masterResume = localBackup['masterResume']
  if (masterResume) {
    try {
      await apiFetch('/api/db/master-resume', { method: 'POST', body: JSON.stringify(masterResume) })
    } catch (e) {
      console.warn('[bootstrap] failed to migrate master resume:', e)
    }
  }

  const settings = localBackup['settings'] as { cloudProvider: string; syncEnabled: boolean; openAiKey: string } | undefined
  if (settings) {
    try {
      await apiFetch('/api/db/settings', { method: 'POST', body: JSON.stringify(settings) })
    } catch (e) {
      console.warn('[bootstrap] failed to migrate settings:', e)
    }
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('_jf_migrated', '1')
  }

  return { migrated: Object.keys(localBackup).length }
}
