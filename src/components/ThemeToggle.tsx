import { useCallback, useSyncExternalStore } from "react"
import { RiMoonLine, RiSunLine } from "@remixicon/react"

import { Button } from "@/components/ui/button"
import { THEME_STORAGE_KEY, THEME_TOGGLE_ICON } from "@/lib/theme-storage"

function subscribe(onChange: () => void) {
  const el = document.documentElement
  const obs = new MutationObserver(onChange)
  obs.observe(el, { attributes: true, attributeFilter: ["class"] })
  return () => obs.disconnect()
}

function getDarkSnapshot() {
  return document.documentElement.classList.contains("dark")
}

function getServerDarkSnapshot() {
  return false
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(
    subscribe,
    getDarkSnapshot,
    getServerDarkSnapshot
  )

  const toggle = useCallback(() => {
    const next = !document.documentElement.classList.contains("dark")
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light")
  }, [])

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="shrink-0"
      aria-label={dark ? "Use light theme" : "Use dark theme"}
      aria-pressed={dark}
      onClick={toggle}
    >
      <RiMoonLine {...{ [THEME_TOGGLE_ICON]: "moon" }} aria-hidden />
      <RiSunLine {...{ [THEME_TOGGLE_ICON]: "sun" }} aria-hidden />
    </Button>
  )
}
