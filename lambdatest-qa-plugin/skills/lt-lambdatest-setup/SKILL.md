---
name: lt-lambdatest-setup
description: "LambdaTest / TestMu AI script templates and setup: Playwright CDP and Selenium capabilities, real iOS/Android devices from Node, credentials loading, tunnel, accessibility/performance flags, SmartUI, REST API for results, KaneAI step-list format, SEO quick checks. Used by the lambdatest-qa agent before generating or running scripts."
---

# LambdaTest script templates

Capability names change over time. Check them against the LambdaTest Capabilities Generator (https://www.lambdatest.com/capabilities-generator/) before running. Credentials always come from `LT_USERNAME` / `LT_ACCESS_KEY` env vars, or from `~/.lambdatest/.env` loaded at run time (`node --env-file=%USERPROFILE%\.lambdatest\.env tests/x.js`). Never write them into scripts, plans or reports.

## Real devices from Node (selenium-webdriver): iOS Safari / Android Chrome
```js
// npm i selenium-webdriver   — run: node --env-file=<path to .env> tests/mobile.js
const { Builder } = require('selenium-webdriver');
async function ltMobile({ platformName, deviceName, platformVersion, browserName, name }) {
  const caps = {
    browserName,                         // 'Safari' (iOS) | 'Chrome' (Android)
    'LT:Options': {
      username: process.env.LT_USERNAME, accessKey: process.env.LT_ACCESS_KEY,
      platformName, deviceName, platformVersion,   // resolve from the LT device list at run time
      isRealMobile: true, build: process.env.LT_BUILD || 'Website QA', name,
      network: true, console: true, video: true, w3c: true,
      tunnel: process.env.LT_TUNNEL === 'true',
    },
  };
  return new Builder().usingServer('https://mobile-hub.lambdatest.com/wd/hub').withCapabilities(caps).build();
}
// mark status: await driver.executeScript('lambda-status=passed');
```

## Playwright (desktop browsers): `tests/lt.config.js`
```js
// Connect each test to LambdaTest via CDP
const caps = (browserName, platform) => ({
  browserName,                // 'Chrome' | 'MicrosoftEdge' | 'pw-webkit' | 'pw-firefox'
  browserVersion: 'latest',
  'LT:Options': {
    platform,                 // 'Windows 11' | 'macOS Sonoma'
    build: process.env.LT_BUILD || 'Website QA',
    name: 'test name',
    user: process.env.LT_USERNAME,
    accessKey: process.env.LT_ACCESS_KEY,
    network: true, console: true, video: true,
    tunnel: process.env.LT_TUNNEL === 'true',
    geoLocation: process.env.LT_GEO || undefined,   // e.g. 'US', 'IN'
    resolution: '1920x1080',
  },
});
const wsEndpoint = (c) =>
  `wss://cdp.lambdatest.com/playwright?capabilities=${encodeURIComponent(JSON.stringify(c))}`;
// usage: const browser = await chromium.connect(wsEndpoint(caps('Chrome','Windows 11')));
// mark status:
// await page.evaluate(_ => {}, `lambdatest_action: ${JSON.stringify({action:'setTestStatus',arguments:{status:'passed',remark:'ok'}})}`);
```

## Selenium (Python): real mobile browser or desktop
```python
import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

def lt_driver(real_mobile=None, browser="Chrome", platform="Windows 11", name="test"):
    opts = Options()
    lt = {
        "username": os.environ["LT_USERNAME"],
        "accessKey": os.environ["LT_ACCESS_KEY"],
        "build": os.getenv("LT_BUILD", "Website QA"),
        "name": name, "w3c": True,
        "network": True, "console": True, "video": True,
        "tunnel": os.getenv("LT_TUNNEL") == "true",
    }
    if real_mobile:   # e.g. {"platformName":"ios","deviceName":"iPhone 16","platformVersion":"18"}
        lt.update(real_mobile); lt["isRealMobile"] = True
    else:
        opts.browser_version = "latest"; lt["platformName"] = platform
        lt["resolution"] = "1920x1080"
    opts.set_capability("LT:Options", lt)
    return webdriver.Remote(command_executor="https://hub.lambdatest.com/wd/hub", options=opts)

# mark status: driver.execute_script("lambda-status=passed")  # or failed
```
Some accounts and endpoints route real devices through `https://mobile-hub.lambdatest.com/wd/hub`. Use whichever the capabilities generator shows for your account.

## Accessibility and performance flags (verify availability on your plan)
- Accessibility scan: `"accessibility": true`, `"accessibility.wcagVersion": "wcag22aa"` in LT:Options. Fallback: inject axe-core (`@axe-core/playwright`) and save the JSON.
- Lighthouse/performance on Chrome: `"performance": true` in LT:Options. Fallback: run `npx lighthouse <url> --output=json --preset=desktop` (and the mobile default) locally for comparison.

## SmartUI visual regression
- Use the SmartUI CLI (`npx smartui exec -- <test command>`) with `PROJECT_TOKEN`, and call `smartuiSnapshot(page, 'name')` at checkpoints.
- The first run creates the baseline. Later runs produce diffs.

## LambdaTest Tunnel (staging/localhost)
- Download the LT tunnel binary and run `LT --user $LT_USERNAME --key $LT_ACCESS_KEY --tunnelName qa-tunnel`, then set `tunnel: true, tunnelName: 'qa-tunnel'`.

## REST API (results)
- Base URL: `https://api.lambdatest.com/automation/api/v1/`, with basic auth `LT_USERNAME:LT_ACCESS_KEY`.
- `GET builds`, `GET sessions?build_id=`, `GET sessions/{id}` (video, logs), `PATCH sessions/{id}` with `{"status_ind":"passed"}`.
- Real device list: check the LambdaTest devices endpoint or the capabilities generator at run time.

## KaneAI step list format (natural language)
```
Test: Checkout - guest user (TC-012, REQ-007, P0)
1. Open https://example.com
2. Search for "running shoes" and open the first product
3. Select size 9 and click "Add to cart"
4. Open the cart and verify the item and price are shown
5. Click "Checkout as guest", fill the shipping form with test data
6. Verify the payment step loads (do not submit payment on production)
```

## SEO quick checks (scriptable without LambdaTest)
For each URL: status 200; one `<title>` of 30-60 chars; meta description of 70-160 chars; canonical present; a single H1; no `noindex` unless intended; all images have alt text; OG tags present; JSON-LD parses. Site-wide: robots.txt is reachable and doesn't block key pages; sitemap.xml is valid and its URLs return 200.
