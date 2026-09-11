const PSI_ENDPOINT =
  'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'

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
 * @param {number | null | undefined} score 0–100
 * @returns {'danger' | 'warn' | 'good'}
 */
export function scoreTone(score) {
  if (score == null || Number.isNaN(score)) return 'danger'
  if (score < 50) return 'danger'
  if (score < 90) return 'warn'
  return 'good'
}

/**
 * @param {Record<string, unknown>} audits
 * @returns {{ title: string, savings: string }[]}
 */
function topOpportunities(audits) {
  return Object.values(audits)
    .filter(
      (audit) =>
        audit &&
        typeof audit === 'object' &&
        audit.details?.type === 'opportunity' &&
        typeof audit.title === 'string',
    )
    .sort(
      (a, b) =>
        (b.details?.overallSavingsMs ?? 0) - (a.details?.overallSavingsMs ?? 0),
    )
    .slice(0, 3)
    .map((audit) => {
      const ms = audit.details?.overallSavingsMs
      const savings =
        typeof ms === 'number' && ms > 0
          ? `Est. savings ${Math.round(ms)} ms`
          : audit.displayValue || 'Opportunity'
      return { title: audit.title, savings }
    })
}

/**
 * Fetch and parse mobile PageSpeed Insights for a URL.
 * @param {string} rawUrl
 * @returns {Promise<{
 *   url: string,
 *   score: number,
 *   fcp: string,
 *   tti: string,
 *   tbt: string,
 *   opportunities: { title: string, savings: string }[],
 * }>}
 */
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

export async function analyzeUrl(rawUrl) {
  const url = normalizeUrl(rawUrl)
  const params = new URLSearchParams({
    url,
    strategy: 'mobile',
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

  return {
    url: lighthouse.finalUrl || url,
    score: Math.round(scoreRaw * 100),
    fcp: audits['first-contentful-paint']?.displayValue || '—',
    tti: audits.interactive?.displayValue || '—',
    tbt: audits['total-blocking-time']?.displayValue || '—',
    opportunities: topOpportunities(audits),
  }
}
