"use client";

import { useEffect } from "react";

/**
 * The homepage ships with plain vanilla JS for: mobile menu toggle,
 * the Favorites heart icon (optimistic toggle + guest login redirect),
 * and scroll-reveal animations. (Hero redesign: the old rotating
 * placeholder examples, category dropdown, "goToCreateRequest" hand-off,
 * and animated stat counters were removed along with the search bar and
 * stats strip they belonged to — the Hero CTA is now a plain link.)
 *
 * This JS lives in src/content/marketing/homepage-scripts.js and is
 * executed here via real <script> DOM elements (not
 * dangerouslySetInnerHTML on <script>, which browsers intentionally do
 * not execute) — this is the only reliable way to run legacy inline-
 * script behavior once it's mounted through dangerouslySetInnerHTML
 * markup, and it keeps the homepage's behavior identical to the
 * locked static file without rewriting it as React state/effects
 * (which risks subtly changing behavior).
 */
export function LegacyHomepageScripts() {
  useEffect(() => {
    let cancelled = false;
    const injected: HTMLScriptElement[] = [];

    fetch("/marketing/homepage-scripts.js")
      .then((res) => res.text())
      .then((code) => {
        if (cancelled) return;
        const script = document.createElement("script");
        script.text = code;
        document.body.appendChild(script);
        injected.push(script);
      });

    return () => {
      cancelled = true;
      injected.forEach((s) => s.remove());
    };
  }, []);

  return null;
}
