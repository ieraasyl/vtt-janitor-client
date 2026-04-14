const API_BASE = import.meta.env.PUBLIC_API_URL

export const VTT_JANITOR_MAX_BYTES = 1024 * 1024

export type CleanVttOptions = {
  removeFillers: boolean
  preserveSpeakers: boolean
  title: string
}

export type CleanVttResult =
  | { ok: true; text: string }
  | { ok: false; error: string; status: number }

export async function cleanVtt(
  vtt: string,
  options: CleanVttOptions
): Promise<CleanVttResult> {
  const params = new URLSearchParams()
  if (options.removeFillers) params.set("removeFillers", "true")
  if (options.preserveSpeakers) params.set("preserveSpeakers", "true")
  params.set("title", options.title.trim() || "Transcript")

  const res = await fetch(`${API_BASE}/clean?${params}`, {
    method: "POST",
    headers: { "Content-Type": "text/plain; charset=utf-8" },
    body: vtt,
  })

  if (!res.ok) {
    try {
      const data = (await res.json()) as { error?: string }
      return {
        ok: false,
        error: data.error ?? res.statusText,
        status: res.status,
      }
    } catch {
      return {
        ok: false,
        error: res.statusText || "Request failed",
        status: res.status,
      }
    }
  }

  return { ok: true, text: await res.text() }
}
