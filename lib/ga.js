export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
const DEBUG_MODE = process.env.NEXT_PUBLIC_GA_DEBUG === 'true' || process.env.NODE_ENV !== 'production'

export const pageview = (url) => {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined') return
  window.gtag('event', 'page_view', {
    page_path: url,
    debug_mode: DEBUG_MODE
  })
  if (DEBUG_MODE) {
    // eslint-disable-next-line no-console
    console.debug('[GA4] page_view', url)
  }
}

export const trackEvent = ({ action, category, label, value, params = {} }) => {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined') return
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value,
    debug_mode: DEBUG_MODE,
    ...params
  })
  if (DEBUG_MODE) {
    // eslint-disable-next-line no-console
    console.debug('[GA4] event', { action, category, label, value, params })
  }
}


