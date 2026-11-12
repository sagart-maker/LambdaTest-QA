---
name: lt-performance-testing
description: "Performance testing playbook for websites on LambdaTest: Lighthouse and Core Web Vitals (LCP, INP/TBT, CLS), TTFB, page weight, on throttled mobile and desktop, compared to thresholds. Front-end performance only — not load/stress testing. Used by the lambdatest-qa agent."
---

# Performance testing (front-end)

## Scope
Page-load and interaction performance as a user experiences it. **Not** load/stress/soak testing — that needs explicit approval and a different tool; if the brief asks for it, mark it "needs approval" and don't run it.

## Measurements per page
| Metric | Threshold (default) |
|---|---|
| Lighthouse Performance score | ≥ 80 (mobile), ≥ 90 (desktop) |
| LCP | < 2.5 s |
| INP (field) / TBT (lab proxy) | INP < 200 ms / TBT < 200 ms |
| CLS | < 0.1 |
| TTFB | < 800 ms |
| FCP | < 1.8 s |
| Page weight / requests | report; flag > 3 MB or > 100 requests on mobile |

## How
- **Mobile:** Lighthouse mobile preset, simulated Fast 4G + 4× CPU slowdown. **Desktop:** `--preset=desktop`.
- **LambdaTest:** `"performance": true` in LT:Options on Chrome (verify availability), or LambdaTest's Lighthouse/performance tooling in Mode A.
- **Local fallback:** `npx lighthouse <url> --output=json --output-path=evidence/perf/<page>-mobile.json --quiet --chrome-flags="--headless"` (and `--preset=desktop`).
- Run **3 times per page per form factor, report the median**; note variance if scores differ > 10 points.
- Real-device timing (optional): on LambdaTest real iPhone/Android, capture Navigation Timing (`performance.getEntriesByType('navigation')`) and LCP via `PerformanceObserver` for the P0 pages.
- Throttled network profiles on LambdaTest: `networkThrottling` capability where available.

## Diagnose
For each page over threshold, list the top Lighthouse opportunities with estimated savings: LCP element and its cause (slow server, render-blocking resources, unoptimised image), main-thread long tasks / heavy JS, layout-shift culprits, unused JS/CSS, image formats/sizes, caching headers, third-party cost.

## TC patterns
`TC-PERF-###` — "Homepage mobile LCP < 2.5s", "PDP CLS < 0.1 on desktop".

## Pass/fail
Every P0 page meets thresholds on mobile. LCP > 4 s or CLS > 0.25 on a P0 page = High; other misses = Medium.

## Report section — "Performance"
Scorecard table: page × (mobile, desktop) × score, LCP, TBT/INP, CLS, TTFB, weight — colour vs threshold · top opportunities per failing page · method (LambdaTest vs local, runs, throttling).
