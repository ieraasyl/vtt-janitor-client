import { useCallback, useEffect, useId, useRef, useState } from "react"

import { SiteHeader } from "@/components/SiteHeader"
import { Button } from "@/components/ui/button"
import { VTT_JANITOR_MAX_BYTES, cleanVtt } from "@/lib/vtt-janitor-api"

function safeDownloadFilename(title: string): string {
  const stem = title
    .trim()
    .replace(/["\\]/g, "")
    .replace(/[^\w\-./ ]+/g, "_")
    .slice(0, 200)
  return `${stem || "Transcript"}.txt`
}

function suggestedTitleFromFileName(fileName: string): string {
  const base = fileName.trim().replace(/[/\\]/g, "")
  if (!base) return "Transcript"
  const withoutExt = base.replace(/\.(vtt|webvtt)$/i, "").trim()
  return withoutExt || "Transcript"
}

function replaceOutputTitleLine(output: string, title: string): string {
  const lineEnd = output.indexOf("\n")
  const firstLine = lineEnd === -1 ? output : output.slice(0, lineEnd)
  if (!/^Title:\s*/i.test(firstLine)) return output
  const rest = lineEnd === -1 ? "" : output.slice(lineEnd)
  const normalized = title.trim() || "Transcript"
  return `Title: ${normalized}${rest}`
}

const inputClass =
  "w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"

export function VttJanitorClient() {
  const fileInputId = useId()

  const [vtt, setVtt] = useState("")
  const [title, setTitle] = useState("Transcript")
  const [removeFillers, setRemoveFillers] = useState(false)
  const [preserveSpeakers, setPreserveSpeakers] = useState(false)
  const [output, setOutput] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copyDone, setCopyDone] = useState(false)
  const copyResetRef = useRef<number>(undefined)

  useEffect(() => () => window.clearTimeout(copyResetRef.current), [])

  const onTitleChange = useCallback((value: string) => {
    setTitle(value)
    setOutput((prev) => replaceOutputTitleLine(prev, value))
  }, [])

  const onFile = useCallback(async (file: File | undefined) => {
    if (!file) return
    setError(null)
    if (file.size > VTT_JANITOR_MAX_BYTES) {
      setError(
        `File is larger than ${VTT_JANITOR_MAX_BYTES / 1024 / 1024} MiB.`
      )
      return
    }
    try {
      setTitle(suggestedTitleFromFileName(file.name))
      setOutput("")
      setVtt(await file.text())
    } catch {
      setError("Could not read that file.")
    }
  }, [])

  const onSubmit = useCallback(async () => {
    const trimmed = vtt.trim()
    if (!trimmed) {
      setError("Add VTT content (paste or choose a file).")
      setOutput("")
      return
    }

    const encoded = new TextEncoder().encode(trimmed)
    if (encoded.byteLength > VTT_JANITOR_MAX_BYTES) {
      setError(
        `Content is larger than ${VTT_JANITOR_MAX_BYTES / 1024 / 1024} MiB.`
      )
      setOutput("")
      return
    }

    setLoading(true)
    setError(null)
    setOutput("")

    const result = await cleanVtt(trimmed, {
      removeFillers,
      preserveSpeakers,
      title,
    })

    setLoading(false)

    if (!result.ok) {
      setError(result.error || `Request failed (${result.status}).`)
      return
    }

    setOutput(result.text)
  }, [vtt, title, removeFillers, preserveSpeakers])

  const onDownload = useCallback(() => {
    if (!output.trim()) return
    const blob = new Blob([output], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = safeDownloadFilename(title)
    a.click()
    URL.revokeObjectURL(url)
  }, [output, title])

  const onCopy = useCallback(async () => {
    if (!output.trim()) return
    try {
      await navigator.clipboard.writeText(output)
      setError(null)
      setCopyDone(true)
      window.clearTimeout(copyResetRef.current)
      copyResetRef.current = window.setTimeout(() => {
        setCopyDone(false)
        copyResetRef.current = undefined
      }, 2000)
    } catch {
      setError("Could not copy to clipboard.")
    }
  }, [output])

  const paneTextareaClass = `${inputClass} min-h-[min(40vh,20rem)] flex-1 resize-y font-mono text-xs leading-relaxed lg:min-h-0`

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-[1600px] min-w-0 flex-col">
      <SiteHeader>
        {error ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </SiteHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-4 lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-stretch lg:gap-3 lg:py-4 lg:pb-6">
        <div className="flex min-h-0 flex-col gap-4 max-lg:min-h-[min(50vh,24rem)]">
          <section className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-medium" htmlFor="vtt-input">
                VTT
              </label>
              <input
                aria-label="Choose a .vtt file"
                className="text-xs text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-xs file:text-secondary-foreground"
                id={fileInputId}
                type="file"
                accept=".vtt,text/vtt,text/plain"
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
            </div>
            <textarea
              className={paneTextareaClass}
              id="vtt-input"
              spellCheck={false}
              value={vtt}
              placeholder="Paste WebVTT here or choose a .vtt file…"
              onChange={(e) => setVtt(e.target.value)}
            />
          </section>

          <fieldset className="space-y-3 rounded-lg border border-border p-3">
            <legend className="px-1 text-xs font-medium text-muted-foreground">
              Options
            </legend>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 rounded border border-input accent-primary"
                checked={removeFillers}
                onChange={(e) => setRemoveFillers(e.target.checked)}
              />
              Remove fillers (um, uh, okay…)
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 rounded border border-input accent-primary"
                checked={preserveSpeakers}
                onChange={(e) => setPreserveSpeakers(e.target.checked)}
              />
              Preserve speakers (<code className="text-xs">&lt;v Name&gt;</code>
              )
            </label>
          </fieldset>
        </div>

        <div className="flex shrink-0 items-center justify-center lg:flex-col lg:justify-center lg:px-1">
          <Button
            type="button"
            className="w-full min-w-32 sm:w-auto lg:w-full lg:min-w-28"
            disabled={loading}
            onClick={() => void onSubmit()}
          >
            {loading ? "Cleaning…" : "Clean"}
          </Button>
        </div>

        <div className="flex min-h-0 flex-col gap-2 max-lg:min-h-[min(40vh,20rem)]">
          <label className="text-sm font-medium" htmlFor="output">
            Result
          </label>
          <textarea
            className={paneTextareaClass}
            id="output"
            readOnly
            spellCheck={false}
            value={output}
            placeholder="Cleaned text appears here after you run Clean."
          />
          <div
            className="flex h-9 w-full min-w-0 items-stretch overflow-hidden rounded-lg border border-border bg-background text-sm shadow-xs outline-none focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30"
            role="group"
            aria-label="Download file"
          >
            <button
              type="button"
              className="shrink-0 border-r border-border bg-muted/40 px-3 font-medium text-foreground transition-colors hover:bg-muted/60 focus-visible:z-10 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!output.trim()}
              onClick={onDownload}
            >
              Download
            </button>
            <input
              id="title-input"
              className="min-w-0 flex-1 border-0 bg-transparent px-2 text-foreground outline-none placeholder:text-muted-foreground"
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Transcript"
              aria-label="File name without extension"
            />
            <span className="flex shrink-0 items-center border-l border-border bg-muted/20 px-2.5 font-mono text-xs tracking-tight text-muted-foreground select-none">
              .txt
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full shrink-0"
            disabled={!output.trim()}
            onClick={() => void onCopy()}
          >
            {copyDone ? "Copied!" : "Copy to clipboard"}
          </Button>
        </div>
      </div>
    </div>
  )
}
