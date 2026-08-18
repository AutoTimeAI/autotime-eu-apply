# Platform coverage evidence

The customer-facing matrix at `/compatibility` is generated from the shared 26-platform registry. A status describes one capability only; capture, reviewed autofill and native feeds are not interchangeable claims.

Pull requests run sanitized fixture tests. The weekly `Platform coverage evidence` workflow opens public pages read-only, records field-presence booleans, and uploads JSON/HTML evidence for 90 days. It never signs in, fills a form or submits an application.

Live results do not update production claims. Review `registry-update.json`, reproduce failures, update fixtures where appropriate, and change `lastVerifiedAt` in a normal reviewed pull request. Claims become visibly stale after 30 days.
