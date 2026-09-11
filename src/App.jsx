import { useState } from 'react'
import { analyzeUrl, scoreTone } from './lib/pagespeed.js'

const TONE = {
  danger: {
    bar: 'bg-rose',
    text: 'text-rose',
    soft: 'bg-rose/10 border-rose/25',
    dot: 'bg-rose',
    label: 'Slow',
  },
  warn: {
    bar: 'bg-amber',
    text: 'text-amber',
    soft: 'bg-amber/10 border-amber/25',
    dot: 'bg-amber',
    label: 'Okay',
  },
  good: {
    bar: 'bg-teal',
    text: 'text-teal',
    soft: 'bg-teal/10 border-teal/25',
    dot: 'bg-teal',
    label: 'Fast',
  },
}

function PulseWave({ active = false }) {
  return (
    <svg
      className={`pulse-wave mx-auto h-10 w-full max-w-md ${active ? 'is-active' : ''}`}
      viewBox="0 0 400 40"
      fill="none"
      aria-hidden
    >
      <path
        className="pulse-wave__track"
        d="M0 20 H60 L75 20 L90 6 L105 34 L120 12 L135 28 L150 20 H400"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        className="pulse-wave__beam"
        d="M0 20 H60 L75 20 L90 6 L105 34 L120 12 L135 28 L150 20 H400"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ScoreReadout({ score }) {
  const tone = scoreTone(score)
  const styles = TONE[tone]
  const width = `${Math.min(Math.max(score, 0), 100)}%`

  return (
    <div className="score-reveal">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-hush">
            Mobile score
          </p>
          <p
            className={`mt-2 font-display text-7xl font-semibold leading-none tracking-tight sm:text-8xl ${styles.text}`}
          >
            {score}
          </p>
        </div>
        <span
          className={`mb-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${styles.soft} ${styles.text}`}
        >
          {styles.label}
        </span>
      </div>
      <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-rule">
        <div
          className={`h-full rounded-full ${styles.bar} transition-[width] duration-700 ease-out`}
          style={{ width }}
        />
      </div>
    </div>
  )
}

function MetricCell({ metric }) {
  const styles = TONE[metric.tone] || TONE.warn

  return (
    <div className="min-w-0 py-4 sm:px-3">
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot}`} aria-hidden />
        <p className="font-mono text-xs font-semibold tracking-wide text-signal">
          {metric.acronym}
        </p>
      </div>
      <p className="mt-2 truncate font-mono text-xl font-medium text-chalk sm:text-2xl">
        {metric.value}
      </p>
      <p className="mt-1 text-[11px] leading-snug text-hush">{metric.label}</p>
    </div>
  )
}

function MetricsStrip({ metrics }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-hush">
        Lab metrics
      </p>
      <div className="mt-2 grid grid-cols-1 divide-y divide-rule border-y border-rule sm:grid-cols-5 sm:divide-x sm:divide-y-0">
        {metrics.map((metric) => (
          <MetricCell key={metric.id} metric={metric} />
        ))}
      </div>
    </div>
  )
}

function IssuesList({ issues }) {
  return (
    <div>
      <h2 className="font-display text-base font-semibold tracking-wide text-chalk">
        What to fix first
      </h2>
      <p className="mt-1 text-sm text-hush">
        Ranked by estimated impact on load time.
      </p>
      {issues.length === 0 ? (
        <p className="mt-4 text-sm text-hush">
          No major opportunities or insights reported for this page.
        </p>
      ) : (
        <ol className="mt-4 space-y-2">
          {issues.map((item, index) => (
            <li
              key={item.id || `${item.title}-${index}`}
              className="flex gap-4 border border-rule bg-slate/40 px-4 py-3.5"
            >
              <span className="font-mono text-sm font-medium text-signal tabular-nums">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-chalk">{item.title}</p>
                <p className="mt-1 font-mono text-xs leading-relaxed text-hush">
                  {item.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function LoadingState() {
  return (
    <div
      className="mt-12 flex flex-col items-center gap-3 text-center"
      role="status"
      aria-live="polite"
    >
      <PulseWave active />
      <p className="text-sm font-medium text-chalk">Checking mobile load time…</p>
      <p className="text-xs text-hush">Usually a few seconds</p>
    </div>
  )
}

export default function App() {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (!url.trim() || status === 'loading') return

    setStatus('loading')
    setErrorMessage('')
    setResult(null)

    try {
      const data = await analyzeUrl(url)
      setResult(data)
      setStatus('success')
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Something went wrong. Try again.',
      )
      setStatus('error')
    }
  }

  const isLoading = status === 'loading'
  const canSubmit = Boolean(url.trim()) && !isLoading

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 app-atmosphere" aria-hidden />
      <div className="pointer-events-none absolute inset-0 app-grid" aria-hidden />

      <main className="relative mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-5 py-16 sm:max-w-3xl sm:px-8">
        <header className="hero-in mb-10 text-center sm:mb-12">
          <h1 className="font-display text-[2.75rem] font-semibold leading-none tracking-tight text-chalk sm:text-6xl">
            Page Pulse
          </h1>
          <div className="mt-5 text-signal">
            <PulseWave active={isLoading} />
          </div>
          <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-hush sm:text-lg">
            Enter a URL. See the mobile performance score, core lab metrics, and what to fix first.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="hero-in hero-in-delay">
          <label
            htmlFor="url"
            className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-hush"
          >
            Website URL
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <input
              id="url"
              type="text"
              inputMode="url"
              autoComplete="url"
              placeholder="example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
              className="w-full flex-1 rounded-lg border border-rule bg-slate/80 px-4 py-3.5 text-chalk outline-none transition placeholder:text-hush/45 focus:border-signal/60 focus:ring-2 focus:ring-signal/20 disabled:cursor-not-allowed disabled:opacity-55"
            />
            <button
              type="submit"
              disabled={!canSubmit}
              aria-busy={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-signal px-6 py-3.5 font-display text-sm font-semibold tracking-wide text-void transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100"
            >
              {isLoading ? (
                <>
                  <span className="btn-spinner" aria-hidden />
                  Analyzing…
                </>
              ) : (
                'Check pulse'
              )}
            </button>
          </div>
        </form>

        {status === 'error' && (
          <div
            className="mt-6 rounded-lg border border-rose/30 bg-rose/10 px-4 py-3 text-sm leading-relaxed text-rose"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        {isLoading && <LoadingState />}

        {status === 'success' && result && (
          <section className="mt-12 space-y-10 score-reveal" aria-live="polite">
            <p
              className="truncate text-center font-mono text-xs text-hush sm:text-sm"
              title={result.url}
            >
              {result.url}
            </p>

            <ScoreReadout score={result.score} />
            <MetricsStrip metrics={result.metrics} />
            <IssuesList issues={result.opportunities} />
          </section>
        )}
      </main>

      <style>{`
        .app-atmosphere {
          background:
            radial-gradient(ellipse 80% 50% at 50% -10%, rgba(110, 182, 255, 0.14), transparent 55%),
            radial-gradient(ellipse 45% 35% at 100% 80%, rgba(78, 205, 196, 0.06), transparent 50%),
            linear-gradient(180deg, #05080f 0%, #0a101c 48%, #05080f 100%);
        }

        .app-grid {
          opacity: 0.22;
          background-image:
            linear-gradient(rgba(36, 48, 68, 0.55) 1px, transparent 1px),
            linear-gradient(90deg, rgba(36, 48, 68, 0.55) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse 70% 60% at 50% 35%, black, transparent);
        }

        .pulse-wave__track {
          color: #243044;
        }

        .pulse-wave__beam {
          color: #6eb6ff;
          stroke-dasharray: 420;
          stroke-dashoffset: 420;
          animation: pulse-draw 3.2s ease-in-out infinite;
        }

        .pulse-wave.is-active .pulse-wave__beam {
          animation-duration: 0.9s;
        }

        .btn-spinner {
          width: 0.9rem;
          height: 0.9rem;
          border: 2px solid rgba(5, 8, 15, 0.25);
          border-top-color: #05080f;
          border-radius: 9999px;
          animation: spin 0.7s linear infinite;
        }

        .hero-in {
          animation: rise 0.55s ease-out both;
        }

        .hero-in-delay {
          animation-delay: 0.08s;
        }

        .score-reveal {
          animation: rise 0.5s ease-out both;
        }

        @keyframes pulse-draw {
          0% { stroke-dashoffset: 420; opacity: 0.35; }
          35% { opacity: 1; }
          70% { stroke-dashoffset: 0; opacity: 1; }
          100% { stroke-dashoffset: -40; opacity: 0.35; }
        }

        @keyframes rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
