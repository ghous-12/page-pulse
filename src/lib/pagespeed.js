const PSI_ENDPOINT =
  'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

/** Scored lab metrics that drive the performance score (weight > 0). */
const SCORED_METRICS = [
  {
    id: 'first-contentful-paint',
    acronym: 'FCP',
    label: 'First Contentful Paint',
  },
  {
    id: 'largest-contentful-paint',
    acronym: 'LCP',
    label: 'Largest Contentful Paint',
  },
  {
    id: 'total-blocking-time',
    acronym: 'TBT',
    label: 'Total Blocking Time',
  },
  {
    id: 'cumulative-layout-shift',
    acronym: 'CLS',
    label: 'Cumulative Layout Shift',
  },
  {
    id: 'speed-index',
    acronym: 'SI',
    label: 'Speed Index',
  },
]

/**
 * Normalize raw user input into an absolute https URL.
 * @param {string} input
 * @returns {string}
 */
export function normalizeUrl(input) {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new Error('Please enter a website URL.')
  }

  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`

  let parsed
  try {
    parsed = new URL(withScheme)
  } catch {
    throw new Error('That does not look like a valid URL. Try example.com')
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http and https URLs are supported.')
  }

  if (!parsed.hostname.includes('.')) {
    throw new Error('That does not look like a valid URL. Try example.com')
  }

  return parsed.toString()
}

/**
 * @param {number | null | undefined} score 0–100 category score, or 0–1 audit score
 * @param {'category' | 'audit'} [scale]
 * @returns {'danger' | 'warn' | 'good'}
 */
export function scoreTone(score, scale = 'category') {
  if (score == null || Number.isNaN(score)) return 'danger'
  const value = scale === 'audit' ? score * 100 : score
  if (value < 50) return 'danger'
  if (value < 90) return 'warn'
  return 'good'
}

/**
 * @param {Record<string, any>} audits
 */
function parseMetrics(audits) {
  return SCORED_METRICS.map((metric) => {
    const audit = audits[metric.id]
    const score =
      typeof audit?.score === 'number' ? audit.score : null

    return {
      id: metric.id,
      acronym: metric.acronym,
      label: metric.label,
      value: audit?.displayValue || '—',
      score,
      tone: scoreTone(score, 'audit'),
    }
  })
}

/**
 * Ranked fixes: classic opportunities first, then failing insights/diagnostics.
 * @param {Record<string, any>} audits
 * @returns {{ title: string, detail: string, id: string }[]}
 */
function topIssues(audits) {
  const seen = new Set()
  /** @type {{ title: string, detail: string, id: string, rank: number }[]} */
  const ranked = []

  for (const [id, audit] of Object.entries(audits)) {
    if (!audit || typeof audit !== 'object' || typeof audit.title !== 'string') {
      continue
    }

    if (audit.details?.type === 'opportunity') {
      const ms = audit.details?.overallSavingsMs ?? 0
      const bytes = audit.details?.overallSavingsBytes ?? 0
      let detail = audit.displayValue || ''
      if (typeof ms === 'number' && ms > 0) {
        detail = `Est. savings ${Math.round(ms)} ms`
      } else if (typeof bytes === 'number' && bytes > 0) {
        detail = `Est. savings ${formatBytes(bytes)}`
      }
      ranked.push({
        id,
        title: audit.title,
        detail: detail || 'Worth improving',
        rank: 1_000_000 + (typeof ms === 'number' ? ms : 0) + bytes / 1000,
      })
      seen.add(id)
    }
  }

  for (const [id, audit] of Object.entries(audits)) {
    if (seen.has(id) || !audit || typeof audit !== 'object') continue
    if (typeof audit.score !== 'number' || audit.score >= 0.9) continue
    if (audit.scoreDisplayMode === 'informative' || audit.scoreDisplayMode === 'notApplicable') {
      continue
    }

    const isInsight = id.endsWith('-insight')
    const isDiagnostic =
      audit.details?.type === 'table' ||
      audit.details?.type === 'list' ||
      id.includes('unused') ||
      id.includes('unminified') ||
      id.includes('bootup') ||
      id.includes('mainthread')

    if (!isInsight && !isDiagnostic) continue

    ranked.push({
      id,
      title: audit.title,
      detail: audit.displayValue || truncateText(audit.description, 110) || 'Needs attention',
      rank: (1 - audit.score) * 10_000 + (isInsight ? 500 : 0),
    })
    seen.add(id)
  }

  return ranked
    .sort((a, b) => b.rank - a.rank)
    .slice(0, 5)
    .map(({ title, detail, id }) => ({ title, detail, id }))
}

/**
 * @param {number} bytes
 */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`
}

/**
 * @param {unknown} text
 * @param {number} max
 */
function truncateText(text, max) {
  if (typeof text !== 'string' || !text.trim()) return ''
  const clean = text.replace(/\s+/g, ' ').replace(/\[.*?\]\(.*?\)/g, '').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max - 1)}…`
}

function formatApiError(status, data) {
  const raw =
    data?.error?.message ||
    `PageSpeed Insights failed (${status}). Try another URL.`

  const lower = String(raw).toLowerCase()
  if (
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    status === 429
  ) {
    const hasKey = Boolean(import.meta.env.VITE_PAGESPEED_API_KEY)
    if (hasKey) {
      return 'Daily PageSpeed quota exceeded for your API key. Try again tomorrow, or raise the quota in Google Cloud.'
    }
    return 'Shared free PageSpeed quota is exhausted. Add a free Google API key in .env (see README) to use your own quota.'
  }

  return raw
}

/**
 * Fetch and parse mobile PageSpeed Insights for a URL.
 * @param {string} rawUrl
 */
export async function analyzeUrl(rawUrl) {
  const url = normalizeUrl(rawUrl)
  const params = new URLSearchParams({
    url,
    strategy: 'mobile',
    category: 'performance',
  })

  const apiKey = import.meta.env.VITE_PAGESPEED_API_KEY
  if (apiKey) {
    params.set('key', apiKey)
  }

  const endpoint = `${PSI_ENDPOINT}?${params.toString()}`

  let response
  try {
    response = await fetch(endpoint)
  } catch {
    throw new Error(
      'Could not reach PageSpeed Insights. Check your connection and try again.',
    )
  }

  let data
  try {
    data = await response.json()
  } catch {
    throw new Error('Received an invalid response from PageSpeed Insights.')
  }

  if (!response.ok) {
    throw new Error(formatApiError(response.status, data))
  }

  const lighthouse = data.lighthouseResult
  if (!lighthouse?.audits || !lighthouse?.categories?.performance) {
    throw new Error('No performance data was returned for this URL.')
  }

  const scoreRaw = lighthouse.categories.performance.score
  if (typeof scoreRaw !== 'number') {
    throw new Error('Performance score was missing from the report.')
  }

  const audits = lighthouse.audits
  const metrics = parseMetrics(audits)
  const issues = topIssues(audits)

  return {
    url: lighthouse.finalUrl || url,
    fetchTime: lighthouse.fetchTime || null,
    score: Math.round(scoreRaw * 100),
    metrics,
    // Back-compat aliases used nowhere after UI update, kept for clarity
    fcp: metrics.find((m) => m.id === 'first-contentful-paint')?.value || '—',
    lcp: metrics.find((m) => m.id === 'largest-contentful-paint')?.value || '—',
    tbt: metrics.find((m) => m.id === 'total-blocking-time')?.value || '—',
    cls: metrics.find((m) => m.id === 'cumulative-layout-shift')?.value || '—',
    si: metrics.find((m) => m.id === 'speed-index')?.value || '—',
    opportunities: issues,
  }
}
