import { useState } from 'react'
import { analyzeUrl, scoreTone } from './lib/pagespeed.js'

const TONE_STYLES = {
  danger: {
    ring: 'stroke-danger',
    text: 'text-danger',
    glow: 'bg-danger/15',
    label: 'Needs work',
  },
  warn: {
    ring: 'stroke-warn',
    text: 'text-warn',
    glow: 'bg-warn/15',
    label: 'Average',
  },
  good: {
    ring: 'stroke-pulse',
    text: 'text-pulse',
    glow: 'bg-pulse/15',
    label: 'Good',
  },
}

function ScoreGauge({ score }) {
  const tone = scoreTone(score)
  const styles = TONE_STYLES[tone]
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(Math.max(score, 0), 100) / 100
  const offset = circumference * (1 - progress)

  return (
    <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
      <div
        className={`absolute inset-4 rounded-full blur-2xl ${styles.glow}`}
        aria-hidden
      />
      <svg className="h-full w-full -rotate-90" viewBox="0 0 128 128" aria-hidden>
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          strokeWidth="8"
          className="stroke-ink-border"
        />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${styles.ring} transition-[stroke-dashoffset] duration-700 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-display text-5xl font-extrabold leading-none ${styles.text}`}>
          {score}
        </span>
        <span className="mt-1 text-xs font-medium uppercase tracking-wider text-fog">
          {styles.label}
        </span>
      </div>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wider text-fog">{label}</p>
      <p className="mt-1 truncate font-display text-2xl font-bold text-snow">{value}</p>
    </div>
  )
}

function LoadingPulse() {
  return (
    <div
      className="flex flex-col items-center gap-4 py-12"
      role="status"
      aria-live="polite"
    >
      <div className="relative h-12 w-12">
        <span className="absolute inset-0 animate-ping rounded-full bg-pulse/30" />
        <span className="absolute inset-2 rounded-full bg-pulse/80" />
      </div>
      <p className="text-sm text-fog">Running mobile PageSpeed analysis…</p>
      <p className="text-xs text-fog/70">This usually takes a few seconds</p>
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

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(61,214,140,0.08),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(240,160,75,0.06),_transparent_45%),linear-gradient(180deg,_#0a0e12_0%,_#0d1218_50%,_#0a0e12_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%270 0 200 200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.85%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")',
        }}
        aria-hidden
      />

      <main className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-5 py-16 sm:px-8">
        <header className="mb-10 text-center sm:mb-12">
          <h1 className="font-display text-5xl font-extrabold tracking-tight text-snow sm:text-6xl">
            Page Pulse
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base text-fog sm:text-lg">
            Check how fast a site loads on mobile — score, key timings, and what to fix.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label htmlFor="url" className="sr-only">
            Website URL
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="url"
              type="text"
              inputMode="url"
              autoComplete="url"
              placeholder="example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
              className="w-full flex-1 rounded-xl border border-ink-border bg-ink-raised/80 px-4 py-3.5 text-snow outline-none transition placeholder:text-fog/50 focus:border-pulse/50 focus:ring-2 focus:ring-pulse/20 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="rounded-xl bg-pulse px-6 py-3.5 font-display text-base font-bold text-ink transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pulse disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Analyzing…' : 'Analyze'}
            </button>
          </div>
        </form>

        {status === 'error' && (
          <div
            className="mt-6 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        {isLoading && <LoadingPulse />}

        {status === 'success' && result && (
          <section className="mt-10 animate-[fadeUp_0.45s_ease-out]" aria-live="polite">
            <p className="mb-6 truncate text-center text-sm text-fog" title={result.url}>
              {result.url}
            </p>

            <ScoreGauge score={result.score} />

            <div className="mt-10 grid grid-cols-1 gap-6 border-t border-ink-border pt-8 sm:grid-cols-3 sm:gap-4">
              <Metric label="First Contentful Paint" value={result.fcp} />
              <Metric label="Time to Interactive" value={result.tti} />
              <Metric label="Total Blocking Time" value={result.tbt} />
            </div>

            <div className="mt-10 border-t border-ink-border pt-8">
              <h2 className="font-display text-lg font-bold text-snow">
                Top opportunities
              </h2>
              {result.opportunities.length === 0 ? (
                <p className="mt-3 text-sm text-fog">
                  No major opportunities reported for this page.
                </p>
              ) : (
                <ol className="mt-4 space-y-3">
                  {result.opportunities.map((item, index) => (
                    <li
                      key={`${item.title}-${index}`}
                      className="flex gap-3 rounded-xl border border-ink-border bg-ink-raised/50 px-4 py-3"
                    >
                      <span className="font-display text-sm font-bold text-pulse">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-snow">{item.title}</p>
                        <p className="mt-0.5 text-xs text-fog">{item.savings}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        )}
      </main>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
