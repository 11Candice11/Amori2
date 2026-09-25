package com.candice.amori

import okhttp3.Interceptor
import okhttp3.Response

/**
 * Forces a descriptive User-Agent on outgoing HTTP requests.
 *
 * Why this exists: OpenStreetMap's Nominatim geocoding API (used for the
 * memory location autocomplete) rejects requests with a generic User-Agent —
 * on Android React Native's default is `okhttp/x.y.z`, which Nominatim answers
 * with HTTP 403. Setting the header from JS `fetch` proved unreliable on this
 * RN/okhttp version (okhttp can keep its own default), so we set it here at the
 * network layer where it is guaranteed to apply to every request.
 *
 * We only override the User-Agent when the request hasn't already set a
 * descriptive one, so app requests that intentionally set their own UA are
 * left untouched.
 */
class UserAgentInterceptor(private val userAgent: String) : Interceptor {
  override fun intercept(chain: Interceptor.Chain): Response {
    val original = chain.request()
    val existing = original.header("User-Agent")

    // Leave a caller-provided, non-generic UA alone; otherwise force ours.
    val needsOverride = existing == null || existing.startsWith("okhttp", ignoreCase = true)
    if (!needsOverride) {
      return chain.proceed(original)
    }

    val request = original.newBuilder()
      .header("User-Agent", userAgent)
      .build()
    return chain.proceed(request)
  }
}
