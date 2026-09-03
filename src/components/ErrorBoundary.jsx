import { Component } from 'react'
import { useI18n } from '../i18n'
import { Btn, Icon } from './ui'

/**
 * A render error in one lazy route used to blank the whole <main> area with
 * nothing on screen (that is exactly how the /order?id= hook-order bug looked).
 * This keeps the shell (nav, footer, toasts, theme, language) alive, shows a
 * recoverable state, and hands the message to the console via reportError.
 */
function Fallback({ message, onRetry }) {
  const { t } = useI18n()
  return (
    <div role="alert" className="page-x mx-auto max-w-[820px] py-20">
      <div className="rounded-3xl border border-danger/30 bg-panel p-8 text-center sm:p-12">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-danger/30 bg-danger/10 text-danger">
          <Icon n="pulse" className="size-7" />
        </span>
        <h2 className="mt-6 font-display text-2xl font-extrabold sm:text-3xl">{t('err.title')}</h2>
        <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-dim">{t('err.sub')}</p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Btn onClick={onRetry} size="md">
            <Icon n="refresh" className="size-4" />
            {t('err.retry')}
          </Btn>
          <Btn to="/templates" variant="outline" size="md">
            {t('err.back')}
          </Btn>
        </div>
        {message ? (
          <details className="mt-8 text-start">
            <summary className="cursor-pointer text-[12px] font-semibold text-dim">{t('err.detail')}</summary>
            <pre dir="ltr" className="mt-3 overflow-x-auto rounded-xl border border-line bg-bg p-3 text-[11px] leading-relaxed text-dim">
              {message}
            </pre>
            <p className="mt-3 text-[12px] text-dim">{t('err.hint')}</p>
          </details>
        ) : null}
      </div>
    </div>
  )
}

export default class ErrorBoundary extends Component {
  state = { failed: false, error: null }

  static getDerivedStateFromError(error) {
    return { failed: true, error }
  }

  componentDidCatch(error) {
    // keep it visible to devtools (Error panel / network log) without a second
    // console.error, which React already prints for a render-phase throw
    if (typeof globalThis.reportError === 'function') globalThis.reportError(error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    const message = String(this.state.error?.message || '').slice(0, 400)
    return <Fallback message={message} onRetry={this.props.onRetry} />
  }
}
