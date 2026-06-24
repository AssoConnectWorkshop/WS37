import { NextResponse } from "next/server";

const html = /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>WS37 — Project Deck</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
<link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,600;0,700;1,400&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet" />
<style>
  :root {
    --ink: #1A1A2E;
    --blue: #316BF2;
    --blue-deep: #1E4FD8;
    --blue-light: #EBF0FE;
    --blue-mid: #93B0FA;
    --slate: #3D4566;
    --paper: #F6F7FC;
    --rule: #D8DCF0;
    --white: #FFFFFF;
    --ff-display: "Poppins", system-ui, sans-serif;
    --ff-body: "Roboto", system-ui, sans-serif;
    --s1: 0.75rem;
    --s2: 1rem;
    --s3: 1.25rem;
    --s4: 1.75rem;
    --s5: 2.5rem;
    --s6: 4rem;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html {
    scroll-snap-type: y mandatory;
    overflow-y: scroll;
    scroll-behavior: smooth;
  }

  body {
    font-family: var(--ff-body);
    background: var(--paper);
    color: var(--ink);
  }

  /* Nav dots */
  .nav-dots {
    position: fixed;
    right: 1.25rem;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    z-index: 100;
  }
  .nav-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--blue-mid);
    opacity: 0.35;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.2s;
    border: none;
  }
  .nav-dot:focus-visible { outline: 2px solid var(--blue); outline-offset: 3px; }
  .nav-dot.active { opacity: 1; transform: scale(1.6); background: var(--blue); }

  /* Slides */
  .slide {
    min-height: 100vh;
    scroll-snap-align: start;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 4.5rem 7rem;
    position: relative;
    overflow: hidden;
  }

  /* Cover */
  .slide--cover {
    background: var(--ink);
    color: var(--white);
    padding: 5rem 7rem;
  }
  .slide--cover::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle, rgba(49,107,242,0.22) 1px, transparent 1px);
    background-size: 28px 28px;
    pointer-events: none;
  }

  .cover-eyebrow {
    font-family: var(--ff-body);
    font-size: var(--s1);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--blue-mid);
    margin-bottom: 2.25rem;
    position: relative;
  }
  .cover-title {
    font-family: var(--ff-display);
    font-size: clamp(3.5rem, 8vw, 7rem);
    font-weight: 700;
    line-height: 1.0;
    text-wrap: balance;
    margin-bottom: 2rem;
    color: var(--white);
    position: relative;
  }
  .cover-title em { color: var(--blue); font-style: italic; font-weight: 400; }
  .cover-sub {
    font-family: var(--ff-body);
    font-size: var(--s3);
    color: rgba(255,255,255,0.65);
    max-width: 38ch;
    line-height: 1.55;
    margin-bottom: 3.5rem;
    position: relative;
  }
  .cover-meta {
    display: flex;
    gap: 2rem;
    font-size: var(--s1);
    color: rgba(255,255,255,0.35);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    border-top: 1px solid rgba(255,255,255,0.1);
    padding-top: 1.5rem;
    position: relative;
  }

  /* Content variants */
  .slide--content { background: var(--paper); }
  .slide--white   { background: var(--white); }

  .slide-label {
    font-family: var(--ff-body);
    font-size: var(--s1);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--blue);
    margin-bottom: 0.875rem;
    font-weight: 700;
  }

  .slide-title {
    font-family: var(--ff-display);
    font-size: clamp(2rem, 4vw, 3.25rem);
    font-weight: 600;
    line-height: 1.1;
    text-wrap: balance;
    margin-bottom: 2rem;
    color: var(--ink);
  }

  .rule {
    width: 2.75rem; height: 2px;
    background: var(--blue);
    margin-bottom: 2.25rem;
    border-radius: 1px;
  }

  /* Problem */
  .problem-list { list-style: none; display: flex; flex-direction: column; gap: 1.75rem; max-width: 52ch; }
  .problem-item { display: grid; grid-template-columns: 2rem 1fr; gap: 1.25rem; align-items: start; }
  .problem-num {
    width: 2rem; height: 2rem;
    border-radius: 50%;
    background: var(--blue-light);
    display: flex; align-items: center; justify-content: center;
    font-size: var(--s1); color: var(--blue); font-weight: 700;
    flex-shrink: 0; margin-top: 2px;
    font-variant-numeric: tabular-nums;
  }
  .problem-text { font-size: var(--s3); font-weight: 700; line-height: 1.3; margin-bottom: 0.3rem; color: var(--ink); }
  .problem-sub  { font-size: var(--s2); color: var(--slate); line-height: 1.5; }

  /* Solution */
  .solution-body { display: grid; grid-template-columns: 1fr 1fr; gap: 5rem; align-items: center; max-width: 900px; }
  .solution-text { font-size: var(--s3); line-height: 1.65; color: var(--ink); }
  .solution-text strong { color: var(--blue); font-weight: 700; }
  .solution-stats { display: flex; flex-direction: column; gap: 1.75rem; }
  .stat { display: flex; flex-direction: column; gap: 0.2rem; padding-left: 1.25rem; border-left: 2px solid var(--blue-light); }
  .stat-num   { font-family: var(--ff-display); font-size: var(--s6); line-height: 1; color: var(--blue); font-variant-numeric: tabular-nums; font-weight: 700; }
  .stat-label { font-size: var(--s1); color: var(--slate); text-transform: uppercase; letter-spacing: 0.08em; line-height: 1.4; font-weight: 500; }

  /* Features */
  .feature-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; max-width: 860px; }
  .feature-card {
    background: var(--paper); border: 1px solid var(--rule); border-radius: 3px;
    padding: 1.75rem; display: flex; flex-direction: column; gap: 0.875rem;
  }
  .feature-icon {
    width: 2.25rem; height: 2.25rem;
    background: var(--blue-light); border-radius: 3px;
    display: flex; align-items: center; justify-content: center;
    color: var(--blue); flex-shrink: 0;
  }
  .feature-name { font-size: var(--s2); font-weight: 700; color: var(--ink); line-height: 1.2; }
  .feature-desc { font-size: calc(var(--s2) * 0.95); color: var(--slate); line-height: 1.55; }

  /* Flow */
  .flow-wrap { overflow-x: auto; }
  .flow { display: flex; align-items: flex-start; gap: 0; min-width: 600px; max-width: 900px; }
  .flow-step { flex: 1; }
  .flow-arrow { padding: 0 0.5rem; color: var(--rule); font-size: 1.1rem; flex-shrink: 0; margin-top: 2.25rem; line-height: 1; }
  .flow-bar { height: 3px; background: var(--blue); margin-bottom: 1.25rem; border-radius: 1px; }
  .flow-num  { font-size: var(--s1); font-variant-numeric: tabular-nums; color: var(--blue); font-weight: 700; letter-spacing: 0.08em; margin-bottom: 0.625rem; }
  .flow-name { font-size: var(--s3); font-weight: 700; color: var(--ink); line-height: 1.2; margin-bottom: 0.5rem; }
  .flow-desc { font-size: calc(var(--s2) * 0.95); color: var(--slate); line-height: 1.5; padding-right: 1rem; }

  /* Next steps */
  .next-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; max-width: 860px; }
  .next-item { border-top: 2px solid var(--blue); padding-top: 1.25rem; }
  .next-name { font-size: var(--s3); font-weight: 700; color: var(--ink); margin-bottom: 0.625rem; line-height: 1.25; }
  .next-desc { font-size: calc(var(--s2) * 0.95); color: var(--slate); line-height: 1.55; }
  .demo-footer { margin-top: 3rem; padding-top: 2rem; border-top: 1px solid var(--rule); }
  .demo-footer-label { font-size: var(--s1); color: var(--slate); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 0.25rem; font-weight: 500; }
  .demo-footer-url { font-size: var(--s3); color: var(--blue); font-weight: 700; }

  @media (max-width: 768px) {
    .slide { padding: 2.5rem 1.75rem; }
    .slide--cover { padding: 3rem 1.75rem; }
    .feature-grid { grid-template-columns: 1fr; }
    .solution-body { grid-template-columns: 1fr; gap: 2.5rem; }
    .next-grid { grid-template-columns: 1fr; }
    .nav-dots { right: 0.625rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
  }
</style>
</head>
<body>

<nav class="nav-dots" aria-label="Slide navigation">
  <button class="nav-dot active" data-idx="0" title="Cover"></button>
  <button class="nav-dot" data-idx="1" title="The problem"></button>
  <button class="nav-dot" data-idx="2" title="The solution"></button>
  <button class="nav-dot" data-idx="3" title="Features"></button>
  <button class="nav-dot" data-idx="4" title="User journey"></button>
  <button class="nav-dot" data-idx="5" title="What's next"></button>
</nav>

<!-- 1 · Cover -->
<section class="slide slide--cover" id="s0">
  <p class="cover-eyebrow">AssoConnect &middot; Workshop 37 &middot; June 2026</p>
  <h1 class="cover-title">WS37<br><em>Grants,</em><br>without the grind.</h1>
  <p class="cover-sub">A grant application assistant for French nonprofits &mdash; one that already knows your organisation.</p>
  <div class="cover-meta">
    <span>Cerfa 12156*06</span>
    <span>AssoConnect API</span>
    <span>Supabase &middot; Vercel</span>
  </div>
</section>

<!-- 2 · Problem -->
<section class="slide slide--content" id="s1">
  <p class="slide-label">The problem</p>
  <h2 class="slide-title">Applying for a grant<br>takes way too long.</h2>
  <div class="rule"></div>
  <ul class="problem-list">
    <li class="problem-item">
      <div class="problem-num" aria-hidden="true">1</div>
      <div>
        <p class="problem-text">An 8-section Cerfa form</p>
        <p class="problem-sub">60+ fields to fill in, many of them identical for every new application</p>
      </div>
    </li>
    <li class="problem-item">
      <div class="problem-num" aria-hidden="true">2</div>
      <div>
        <p class="problem-text">Data scattered everywhere</p>
        <p class="problem-sub">INSEE, bylaws, financial reports, AssoConnect &mdash; each source looked up separately, by hand</p>
      </div>
    </li>
    <li class="problem-item">
      <div class="problem-num" aria-hidden="true">3</div>
      <div>
        <p class="problem-text">Start from scratch every time</p>
        <p class="problem-sub">No reuse across applications, no structured history to build on</p>
      </div>
    </li>
  </ul>
</section>

<!-- 3 · Solution -->
<section class="slide slide--content" id="s2">
  <p class="slide-label">The solution</p>
  <h2 class="slide-title">Your organisation,<br>pre-filled.</h2>
  <div class="rule"></div>
  <div class="solution-body">
    <p class="solution-text">WS37 connects your <strong>AssoConnect</strong> account to the Cerfa 12156*06 form. Your organisation&rsquo;s data is imported automatically. You only fill in what&rsquo;s specific to the project &mdash; <strong>in minutes</strong>, not hours.</p>
    <div class="solution-stats">
      <div class="stat">
        <span class="stat-num">8</span>
        <span class="stat-label">Cerfa sections handled end-to-end</span>
      </div>
      <div class="stat">
        <span class="stat-num">3</span>
        <span class="stat-label">automatic import sources</span>
      </div>
      <div class="stat">
        <span class="stat-num">1</span>
        <span class="stat-label">form, reusable as many times as you need</span>
      </div>
    </div>
  </div>
</section>

<!-- 4 · Features -->
<section class="slide slide--white" id="s3">
  <p class="slide-label">Features</p>
  <h2 class="slide-title">What WS37 does for you.</h2>
  <div class="rule"></div>
  <div class="feature-grid">
    <div class="feature-card">
      <div class="feature-icon" aria-hidden="true">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
      </div>
      <p class="feature-name">AssoConnect pre-fill</p>
      <p class="feature-desc">Your organisation&rsquo;s details are pulled from the AssoConnect API the moment you open the form.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon" aria-hidden="true">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      </div>
      <p class="feature-name">SIREN / INSEE lookup</p>
      <p class="feature-desc">Type a SIREN number and fetch official registry data from the Sirene directory in one click.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon" aria-hidden="true">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
      </div>
      <p class="feature-name">Word &amp; PDF import</p>
      <p class="feature-desc">Drop an existing document (financial report, bylaws) and WS37 extracts the relevant data for you.</p>
    </div>
    <div class="feature-card">
      <div class="feature-icon" aria-hidden="true">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      </div>
      <p class="feature-name">Completion tracking &amp; history</p>
      <p class="feature-desc">See completion progress section by section. Retrieve and duplicate past applications in seconds.</p>
    </div>
  </div>
</section>

<!-- 5 · User journey -->
<section class="slide slide--content" id="s4">
  <p class="slide-label">User journey</p>
  <h2 class="slide-title">From zero to a complete<br>grant application.</h2>
  <div class="rule"></div>
  <div class="flow-wrap">
    <div class="flow">
      <div class="flow-step">
        <div class="flow-bar"></div>
        <p class="flow-num">01</p>
        <p class="flow-name">My organisation</p>
        <p class="flow-desc">Review and complete your organisation&rsquo;s permanent data (Sections 1&ndash;5)</p>
      </div>
      <div class="flow-arrow" aria-hidden="true">&rarr;</div>
      <div class="flow-step">
        <div class="flow-bar"></div>
        <p class="flow-num">02</p>
        <p class="flow-name">New project</p>
        <p class="flow-desc">Create an application file for a specific funder, with a project name and objective</p>
      </div>
      <div class="flow-arrow" aria-hidden="true">&rarr;</div>
      <div class="flow-step">
        <div class="flow-bar"></div>
        <p class="flow-num">03</p>
        <p class="flow-name">Fill in sections</p>
        <p class="flow-desc">Complete the project-specific sections: budget, staffing, project description</p>
      </div>
      <div class="flow-arrow" aria-hidden="true">&rarr;</div>
      <div class="flow-step">
        <div class="flow-bar"></div>
        <p class="flow-num">04</p>
        <p class="flow-name">History</p>
        <p class="flow-desc">Archive, duplicate, or pick up a past application to save time on the next one</p>
      </div>
    </div>
  </div>
</section>

<!-- 6 · Next steps -->
<section class="slide slide--white" id="s5">
  <p class="slide-label">What&rsquo;s next</p>
  <h2 class="slide-title">What&rsquo;s still to build.</h2>
  <div class="rule"></div>
  <div class="next-grid">
    <div class="next-item">
      <p class="next-name">Cerfa PDF generation</p>
      <p class="next-desc">Export a filled 12156*06 form ready to submit to the funder, directly from the app.</p>
    </div>
    <div class="next-item">
      <p class="next-name">Multi-user access</p>
      <p class="next-desc">Let multiple members of an organisation collaborate on the same grant files in real time.</p>
    </div>
    <div class="next-item">
      <p class="next-name">Other Cerfa forms</p>
      <p class="next-desc">Extend the engine to other forms common in the nonprofit sector (Fonjep, CAF, DRAC&hellip;).</p>
    </div>
  </div>
  <div class="demo-footer">
    <p class="demo-footer-label">Live demo</p>
    <p class="demo-footer-url">assoconnect-ws37.vercel.app</p>
  </div>
</section>

<script>
  const slides = Array.from(document.querySelectorAll('.slide'));
  const dots   = Array.from(document.querySelectorAll('.nav-dot'));

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const i = slides.indexOf(e.target);
        dots.forEach((d, j) => d.classList.toggle('active', j === i));
      }
    });
  }, { threshold: 0.5 });

  slides.forEach(s => obs.observe(s));
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => slides[i].scrollIntoView({ behavior: 'smooth' }));
  });
</script>
</body>
</html>`;

export async function GET() {
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
