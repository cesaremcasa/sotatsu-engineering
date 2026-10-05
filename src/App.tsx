import { useMemo, useState } from "react";
import scenarios from "../fixtures/scenarios.json";
import publicGalleryImage from "../docs/screenshots/sotatsu-public.jpg";
import {
  ARTIST_API_SCOPES,
  assetWhereForStudio,
  hasArtistApiScopes,
  normalizeArtistApiScopes,
  type ArtistApiScope,
} from "./artist-api-policy.ts";
import { declaredContentLength } from "./upload-policy.ts";
import {
  assertSafetyProviderAvailable,
  parseSafetyProviderVerdict,
  unavailableSafetyVerdict,
} from "./safety-verdict.ts";

type VerdictChoice = "clean" | "blocked" | "unavailable";

export function App() {
  const [granted, setGranted] = useState<ArtistApiScope[]>(
    normalizeArtistApiScopes(scenarios.key.granted as ArtistApiScope[]),
  );
  const [required, setRequired] = useState<ArtistApiScope>(scenarios.key.requested as ArtistApiScope);
  const [studioId, setStudioId] = useState(scenarios.studio.activeStudio);
  const [contentLength, setContentLength] = useState(scenarios.upload.declaredBytes);
  const [verdictChoice, setVerdictChoice] = useState<VerdictChoice>("unavailable");

  const scopeAllowed = hasArtistApiScopes(granted, [required]);
  const assetFilter = assetWhereForStudio(studioId, scenarios.studio.requestedAsset);
  const parsedLength = declaredContentLength(contentLength);
  const uploadAllowed = parsedLength === scenarios.upload.actualBytes &&
    parsedLength <= scenarios.upload.maximumBytes;

  const safety = useMemo(() => {
    const verdict = verdictChoice === "unavailable"
      ? unavailableSafetyVerdict(true)
      : parseSafetyProviderVerdict({ verdict: verdictChoice });
    let retryRequired = false;
    try {
      assertSafetyProviderAvailable(verdict);
    } catch {
      retryRequired = true;
    }
    return { ...verdict, retryRequired };
  }, [verdictChoice]);

  function toggleScope(scope: ArtistApiScope) {
    setGranted((current) => current.includes(scope)
      ? current.filter((item) => item !== scope)
      : [...current, scope]);
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="wordmark" href="#top" aria-label="SOTATSU engineering home">
          <span className="seal">墨</span>
          <span>SOTATSU <i>/</i> ENGINEERING NOTES</span>
        </a>
        <a className="site-link" href="https://sotatsu.com" target="_blank" rel="noreferrer">
          Visit the gallery <span aria-hidden="true">↗</span>
        </a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span className="status-dot" /> SYSTEMS, MADE VISIBLE</p>
          <h1>Good art deserves<br /><em>careful systems.</em></h1>
          <p className="lede">A small working exhibit of the boundaries behind SOTATSU’s agent-facing Artist API: scoped credentials, studio ownership, bounded uploads, and reviewable safety decisions.</p>
          <a className="text-link" href="#playground">Explore the controls <span aria-hidden="true">↓</span></a>
        </div>
        <figure className="public-shot">
          <img src={publicGalleryImage} alt="Public SOTATSU gallery page showing published artwork" />
          <figcaption><span>PUBLIC GALLERY</span><span>Captured 05 Oct 2026</span></figcaption>
        </figure>
      </section>

      <section className="principles" aria-label="System flow">
        <div><span>01</span><strong>Authenticate</strong><small>Short-lived, revocable keys</small></div>
        <b aria-hidden="true">→</b>
        <div><span>02</span><strong>Constrain</strong><small>Scope and studio checks</small></div>
        <b aria-hidden="true">→</b>
        <div><span>03</span><strong>Validate</strong><small>Bytes and safety verdicts</small></div>
        <b aria-hidden="true">→</b>
        <div><span>04</span><strong>Review</strong><small>Human curation before release</small></div>
      </section>

      <section className="playground" id="playground">
        <div className="section-heading">
          <div><p className="eyebrow">SYNTHETIC PLAYGROUND</p><h2>Boundaries you can inspect.</h2></div>
          <p>Every value below is fictional. These controls call the same small policy functions used by the API and worker.</p>
        </div>

        <div className="cards">
          <article className="card scope-card">
            <div className="card-index">01 / ACCESS</div>
            <h3>Keys carry explicit scope.</h3>
            <p>A credential only authorizes operations named in its grant.</p>
            <label className="field-label" htmlFor="required-scope">Attempt operation</label>
            <select id="required-scope" value={required} onChange={(event) => setRequired(event.target.value as ArtistApiScope)}>
              {ARTIST_API_SCOPES.map((scope) => <option key={scope} value={scope}>{scope}</option>)}
            </select>
            <div className="scope-list">
              {ARTIST_API_SCOPES.map((scope) => (
                <label className="check-row" key={scope}>
                  <input type="checkbox" checked={granted.includes(scope)} onChange={() => toggleScope(scope)} />
                  <span>{scope}</span>
                </label>
              ))}
            </div>
            <div className={`result ${scopeAllowed ? "ok" : "denied"}`} role="status">
              <span className="result-mark">{scopeAllowed ? "✓" : "×"}</span>
              <span>{scopeAllowed ? "Authorized for this operation" : "Denied: required scope is missing"}</span>
            </div>
          </article>

          <article className="card studio-card">
            <div className="card-index">02 / OWNERSHIP</div>
            <h3>IDs stay inside a studio.</h3>
            <p>Changing the active studio changes the database predicate for the same synthetic asset ID.</p>
            <label className="field-label" htmlFor="active-studio">Authenticated studio</label>
            <select id="active-studio" value={studioId} onChange={(event) => setStudioId(event.target.value)}>
              <option value={scenarios.studio.activeStudio}>Studio A · authorized</option>
              <option value={scenarios.studio.otherStudio}>Studio B · different owner</option>
            </select>
            <div className="codebox"><span>Asset filter</span><code>{JSON.stringify(assetFilter, null, 2)}</code></div>
            <div className={`result ${studioId === scenarios.studio.activeStudio ? "ok" : "denied"}`} role="status">
              <span className="result-mark">{studioId === scenarios.studio.activeStudio ? "✓" : "×"}</span>
              <span>{studioId === scenarios.studio.activeStudio ? "Synthetic asset belongs to this studio" : "Not found in this studio boundary"}</span>
            </div>
          </article>

          <article className="card upload-card">
            <div className="card-index">03 / INGEST</div>
            <h3>Declared bytes are checked.</h3>
            <p>The request header must match the session; the stream is counted again while it is written.</p>
            <label className="field-label" htmlFor="content-length">Synthetic Content-Length</label>
            <div className="input-with-suffix"><input id="content-length" inputMode="numeric" value={contentLength} onChange={(event) => setContentLength(event.target.value)} /><span>bytes</span></div>
            <div className="upload-facts"><span>Expected: {scenarios.upload.actualBytes.toLocaleString()} bytes</span><span>Limit: {scenarios.upload.maximumBytes.toLocaleString()} bytes</span></div>
            <div className={`result ${uploadAllowed ? "ok" : "denied"}`} role="status">
              <span className="result-mark">{uploadAllowed ? "✓" : "×"}</span>
              <span>{uploadAllowed ? "Header matches; body still needs exact-length stream validation" : "Rejected before storage: invalid, mismatched, or oversized length"}</span>
            </div>
          </article>

          <article className="card safety-card">
            <div className="card-index">04 / SAFETY</div>
            <h3>Uncertainty stays visible.</h3>
            <p>Provider errors are retryable in production. A human still decides what reaches the gallery.</p>
            <label className="field-label" htmlFor="safety-verdict">Synthetic provider response</label>
            <select id="safety-verdict" value={verdictChoice} onChange={(event) => setVerdictChoice(event.target.value as VerdictChoice)}>
              <option value="unavailable">Provider unavailable</option>
              <option value="clean">Explicit clean verdict</option>
              <option value="blocked">Explicit blocked verdict</option>
            </select>
            <div className="codebox verdict-box"><span>Worker decision</span><code>{JSON.stringify({ blocked: safety.blocked, reason: safety.reason ?? "none", retryable: safety.retryRequired }, null, 2)}</code></div>
            <div className={`result ${safety.retryRequired ? "pending" : safety.blocked ? "denied" : "ok"}`} role="status">
              <span className="result-mark">{safety.retryRequired ? "↻" : safety.blocked ? "×" : "✓"}</span>
              <span>{safety.retryRequired ? "Retry later; do not publish" : safety.blocked ? "Blocked for review" : "Provider returned clean; curator review still applies"}</span>
            </div>
          </article>
        </div>
      </section>

      <footer className="footer">
        <span>Built from selected SOTATSU code · synthetic examples only</span>
        <span>Artist API ≠ automatic publication</span>
      </footer>
    </main>
  );
}
