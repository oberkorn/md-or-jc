import { ImageResponse } from 'workers-og';

interface Env {
  ASSETS: Fetcher;
}

const CANONICAL = 'https://md-or-jc.com';
const CARDS_PER_GAME = 10;
const REGULAR_CARDS = CARDS_PER_GAME - 1;

// Obfuscation — turn 9-bit result mask (0..511) into a ~9-digit deterministic
// code so URLs don't look sequential. Keep these in sync with index.html.
const OBF_M = 999999937;
const OBF_P = 2654435769;
const OBF_C = 123456789;

function obfuscate(mask: number): string {
  return (((mask * OBF_P) + OBF_C) % OBF_M).toString();
}

function deobfuscate(code: string): number {
  const target = Number(code);
  if (!Number.isFinite(target) || target < 0) return 0;
  for (let i = 0; i <= 0x1ff; i++) {
    if (((i * OBF_P) + OBF_C) % OBF_M === target) return i;
  }
  return 0;
}

type Verdict = { text: string; sub: string };
const VERDICTS: Record<number, Verdict> = {
  9: { text: 'Almost divine!', sub: 'Impressive diagnostic skills.' },
  8: { text: 'Almost divine!', sub: 'Impressive diagnostic skills.' },
  7: { text: 'Solid intuition.', sub: "You've got a good eye." },
  6: { text: 'Solid intuition.', sub: "You've got a good eye." },
  5: { text: 'Could go either way.', sub: 'Maybe schedule a follow-up?' },
  4: { text: 'Could go either way.', sub: 'Maybe schedule a follow-up?' },
  3: { text: 'Misdiagnosed.', sub: "Don't quit your day job." },
  2: { text: 'Misdiagnosed.', sub: "Don't quit your day job." },
  1: { text: 'Misdiagnosed.', sub: "Don't quit your day job." },
  0: { text: 'Misdiagnosed.', sub: "Don't quit your day job." },
};

function decode(raw: string) {
  const clean = (raw || '').replace(/[^0-9]/g, '');
  const mask = deobfuscate(clean) & 0x1ff; // only bits 0..8 (regular cards)
  const bits: boolean[] = [];
  for (let i = REGULAR_CARDS - 1; i >= 0; i--) bits.push(!!(mask & (1 << i)));
  bits.push(false); // trump card is always scored wrong
  const score = bits.slice(0, REGULAR_CARDS).filter(Boolean).length;
  const canonicalId = obfuscate(mask);
  return { mask, bits, score, canonicalId };
}

function gridEmoji(bits: boolean[]) {
  return bits
    .map((b, i) => {
      if (i === REGULAR_CARDS) return '🗽';
      return b ? '✅' : '❌';
    })
    .join('');
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function landingHtml(id: string, score: number, bits: boolean[]) {
  const verdict = VERDICTS[score] ?? VERDICTS[0];
  const grid = gridEmoji(bits);
  const title = `Scored ${score}/${CARDS_PER_GAME} on MD or JC?`;
  const description = `${grid} — Can you beat it?`;
  const ogImage = `${CANONICAL}/og/${id}.png`;
  const pageUrl = `${CANONICAL}/s/${id}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<meta name="theme-color" content="#0d0d0d" />
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="MD or JC?" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:image" content="${ogImage}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="${escapeHtml(title)}" />
<meta property="og:url" content="${pageUrl}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${ogImage}" />
<style>
  html,body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0d0d0d;color:#f0f0f0}
  .wrap{min-height:100vh;background:linear-gradient(160deg,#0d0d0d 0%,#1a1a2e 40%,#16213e 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;box-sizing:border-box}
  h1{margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:42px;font-weight:900;letter-spacing:-1px}
  .md{color:#4fc3f7}.or{color:#666;font-size:24px;font-style:italic;margin:0 6px;font-weight:400}.jc{color:#ffb74d}.q{color:#ef5350}
  .score{font-family:Georgia,serif;font-size:88px;font-weight:900;margin:16px 0 4px;background:linear-gradient(135deg,#4fc3f7,#ffb74d);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;color:transparent;line-height:1}
  .grid{font-size:28px;letter-spacing:4px;margin:16px 0}
  .verdict{font-size:22px;font-weight:700;margin:4px 0}
  .sub{color:#888;font-style:italic;margin:0 0 32px}
  .cta{display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#e53935,#ff7043);color:#fff;text-decoration:none;font-weight:700;font-size:18px;border-radius:12px;box-shadow:0 4px 20px rgba(229,57,53,0.4);transition:transform .2s}
  .cta:hover{transform:translateY(-2px)}
</style>
</head>
<body>
<div class="wrap">
  <h1><span class="md">MD</span><span class="or">or</span><span class="jc">JC</span><span class="q">?</span></h1>
  <div class="score">${score}/${CARDS_PER_GAME}</div>
  <div class="grid">${grid}</div>
  <div class="verdict">${escapeHtml(verdict.text)}</div>
  <div class="sub">${escapeHtml(verdict.sub)}</div>
  <a class="cta" href="/">Can you beat it?</a>
</div>
</body>
</html>`;
}

function ogCardHtml(score: number, bits: boolean[]) {
  const verdict = VERDICTS[score] ?? VERDICTS[0];
  const grid = gridEmoji(bits);
  return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:1200px;height:630px;background:linear-gradient(135deg,#0d0d0d 0%,#1a1a2e 50%,#16213e 100%);color:#f0f0f0;padding:40px;font-family:sans-serif">
    <div style="display:flex;align-items:baseline;font-size:72px;font-weight:900;letter-spacing:-2px">
      <span style="color:#4fc3f7">MD</span>
      <span style="color:#888;font-size:40px;margin:0 14px;font-style:italic;font-weight:400">or</span>
      <span style="color:#ffb74d">JC</span>
      <span style="color:#ef5350">?</span>
    </div>
    <div style="display:flex;font-size:180px;font-weight:900;color:#ffb74d;line-height:1;margin:24px 0 8px;letter-spacing:-6px">${score}/${CARDS_PER_GAME}</div>
    <div style="display:flex;font-size:68px;letter-spacing:12px;margin:8px 0 20px">${grid}</div>
    <div style="display:flex;font-size:44px;font-weight:700;margin-top:8px">${verdict.text}</div>
    <div style="display:flex;font-size:28px;color:#888;font-style:italic;margin-top:12px">md-or-jc.com — can you beat it?</div>
  </div>`;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path.startsWith('/og/') && path.endsWith('.png')) {
      const id = path.slice(4, -4);
      const { score, bits } = decode(id);
      return new ImageResponse(ogCardHtml(score, bits), {
        width: 1200,
        height: 630,
        emoji: 'twemoji',
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    if (path.startsWith('/s/')) {
      const id = path.slice(3).split('/')[0];
      const { score, bits, canonicalId } = decode(id);
      return new Response(landingHtml(canonicalId, score, bits), {
        headers: {
          'Content-Type': 'text/html; charset=UTF-8',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    return env.ASSETS.fetch(req);
  },
};
