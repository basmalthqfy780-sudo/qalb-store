/**
 * Distinguishing "this page threw while rendering" from "this tab is holding a
 * stale module graph".
 *
 * The second one is not fixable by re-running the render: after the dev server
 * restarts (or a new build replaces the old one under the same URL), a tab that
 * is still open asks for a lazy route chunk whose *exports* no longer match what
 * its already-loaded shared modules were compiled against — Vite answers with
 * "The requested module '/src/api/index.js' does not provide an export named
 * 'deliveryAllHref'". Only a full document reload re-fetches every module and
 * lines them up again, so the boundary treats these as recoverable-by-reload and
 * arms exactly one automatic attempt per page session (a real deploy mid-read
 * must not turn into a reload loop).
 */

/* The exact shapes each engine prints, plus the esbuild/Vite variants. */
const STALE_LOAD =
  /does not provide an export|has already exported a value|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Failed to resolve module|Cannot find (?:module|entry point)/i

/** True when the error means "modules disagree", not "the component is broken". */
export function isStaleLoadError(message = '') {
  return STALE_LOAD.test(String(message || ''))
}

const FLAG = 'qalb.stale-reload'
const store = () => {
  try {
    return globalThis.sessionStorage || null
  } catch {
    return null
  }
}

/**
 * Claim the single allowed auto-reload for this tab. Returns true the first time
 * (and the caller should reload), false afterwards, so a page that stays broken
 * after a reload falls back to the readable error state instead of refreshing
 * forever. Storage may be blocked (private mode, embeds) — then we do not reload
 * automatically at all, we just show the button.
 */
export function claimStaleReload() {
  const s = store()
  if (!s) return false
  try {
    if (s.getItem(FLAG) === '1') return false
    s.setItem(FLAG, '1')
    return true
  } catch {
    return false
  }
}

/** A route that rendered fine: arm the one-shot again for whatever comes next. */
export function clearStaleReload() {
  const s = store()
  if (!s) return
  try {
    s.removeItem(FLAG)
  } catch {
    /* nothing to clear */
  }
}

/** The manual escape hatch, offered by the fallback UI (no flag, user is in control). */
export function reloadDocument() {
  try {
    globalThis.location?.reload?.()
  } catch {
    /* no document to reload (unit test, SSR) */
  }
}
