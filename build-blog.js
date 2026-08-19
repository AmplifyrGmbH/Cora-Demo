// build-blog.js — Contentful → statische HTML-Dateien in _blog-dist/
// Contentful Content Type ID (Contentful → Content model → API identifier)
const CONTENT_TYPE = 'immoblog';
const OUT_DIR = '_blog-dist';
const SITE_URL = 'https://cora-immobilien.ch';

const contentful = require('contentful');
const { documentToHtmlString } = require('@contentful/rich-text-html-renderer');
const fs = require('fs');
const path = require('path');

const SPACE_ID = process.env.CONTENTFUL_SPACE_ID;
const ACCESS_TOKEN = process.env.CONTENTFUL_ACCESS_TOKEN;

if (!SPACE_ID || !ACCESS_TOKEN) {
  console.error('Fehler: CONTENTFUL_SPACE_ID oder CONTENTFUL_ACCESS_TOKEN fehlt.');
  process.exit(1);
}

const client = contentful.createClient({ space: SPACE_ID, accessToken: ACCESS_TOKEN });

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('de-CH', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

const BLOG_CSS = `
  <style>
    .blog-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 2rem;
      margin-top: 3rem;
    }
    .blog-card {
      display: flex;
      flex-direction: column;
      background: var(--white);
      border: 1px solid var(--gray-200);
      border-radius: 16px;
      overflow: hidden;
      text-decoration: none;
      color: inherit;
      transition: box-shadow 0.2s, transform 0.2s;
    }
    .blog-card:hover {
      box-shadow: 0 8px 32px rgba(0,0,0,0.10);
      transform: translateY(-2px);
    }
    .blog-card__img {
      width: 100%;
      aspect-ratio: 16/9;
      background-size: cover;
      background-position: center;
    }
    .blog-card__img--placeholder {
      background-color: var(--cora-blue-light, #eff4fb);
    }
    .blog-card__body {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      flex: 1;
    }
    .blog-card__title {
      font-size: 1.1rem;
      font-weight: 700;
      line-height: 1.3;
      margin: 0;
      color: var(--black);
    }
    .blog-card__excerpt {
      font-size: 0.9rem;
      color: var(--gray-600, #555);
      line-height: 1.6;
      margin: 0;
      flex: 1;
    }
    .blog-card__link {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--cora-blue);
      margin-top: 0.5rem;
    }
    .blog-body {
      font-size: 1rem;
      line-height: 1.8;
      color: var(--black);
    }
    .blog-body h1, .blog-body h2, .blog-body h3, .blog-body h4 {
      margin-top: 2rem;
      margin-bottom: 0.75rem;
      font-weight: 700;
      line-height: 1.25;
    }
    .blog-body h2 { font-size: 1.5rem; }
    .blog-body h3 { font-size: 1.2rem; }
    .blog-body p { margin: 0 0 1.25rem; }
    .blog-body ul, .blog-body ol { padding-left: 1.5rem; margin: 0 0 1.25rem; }
    .blog-body li { margin-bottom: 0.4rem; }
    .blog-body a { color: var(--cora-blue); text-underline-offset: 3px; }
    .blog-body img { max-width: 100%; border-radius: 8px; margin: 1.5rem 0; }
    .blog-body blockquote {
      border-left: 3px solid var(--cora-blue);
      margin: 1.5rem 0;
      padding: 0.75rem 1.25rem;
      background: var(--cora-blue-light, #eff4fb);
      border-radius: 0 8px 8px 0;
      font-style: italic;
    }
  </style>`;

const NAV_HTML = `
  <nav class="nav nav--scrolled">
    <div class="nav__inner">
      <a href="/" class="nav__logo">
        <img src="../Bilder/logo_transparent_2.png" alt="CORA Immobilien" />
      </a>
      <div class="nav__links">
        <a href="/bewirtschaftung" class="nav__link">Bewirtschaftung</a>
        <a href="/vermietung" class="nav__link">Vermietung</a>
        <a href="/verkauf" class="nav__link">Verkauf</a>
        <a href="/beratung" class="nav__link">Beratung</a>
        <a href="/freelance" class="nav__link">Freelance</a>
        <a href="/team" class="nav__link">Team</a>
        <a href="/blog" class="nav__contact">Immoblog</a>
      </div>
      <button class="nav__toggle" id="navToggle" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
    </div>
    <div class="nav__mobile" id="navMobile">
      <a href="/bewirtschaftung" class="nav__link">Bewirtschaftung</a>
      <a href="/vermietung" class="nav__link">Vermietung</a>
      <a href="/verkauf" class="nav__link">Verkauf</a>
      <a href="/beratung" class="nav__link">Beratung</a>
      <a href="/freelance" class="nav__link">Freelance</a>
      <a href="/team" class="nav__link">Team</a>
      <a href="/blog" class="nav__link">Immoblog</a>
    </div>
  </nav>`;

const FOOTER_HTML = `
  <footer class="footer">
    <div class="footer__inner">
      <div class="footer__top">
        <div>
          <div class="footer__brand-name">CORA Immobilien</div>
          <p class="footer__brand-text">
            Persönliches Immobilienmanagement mit Erfahrung,
            Ehrlichkeit und Engagement – für Eigentümerinnen und Mieterinnen in Zürich und Aargau.
          </p>
        </div>
        <div>
          <div class="footer__col-title">Leistungen</div>
          <div class="footer__col-links">
            <a href="/bewirtschaftung" class="footer__col-link">Bewirtschaftung</a>
            <a href="/vermietung" class="footer__col-link">Vermietung</a>
            <a href="/verkauf" class="footer__col-link">Verkauf</a>
            <a href="/beratung" class="footer__col-link">Beratung</a>
            <a href="/freelance" class="footer__col-link">Freelance</a>
          </div>
        </div>
        <div>
          <div class="footer__col-title">Unternehmen</div>
          <div class="footer__col-links">
            <a href="/team" class="footer__col-link">Team</a>
            <a href="/blog" class="footer__col-link">Blog</a>
            <a href="/kontakt" class="footer__col-link">Kontakt</a>
          </div>
        </div>
        <div>
          <div class="footer__col-title">Kontakt</div>
          <div class="footer__col-links">
            <span class="footer__col-link" style="cursor:default">Im Rüteli 13B, 5405 Dättwil</span>
            <a href="tel:+41565520130" class="footer__col-link">+41 56 552 01 30</a>
            <a href="mailto:info@cora-immobilien.ch" class="footer__col-link">info@cora-immobilien.ch</a>
          </div>
        </div>
      </div>
      <div style="padding:1.75rem 0;border-top:1px solid rgba(0,0,0,0.08);border-bottom:1px solid rgba(0,0,0,0.08);display:flex;align-items:center;justify-content:center;gap:3rem;flex-wrap:wrap">
        <span style="font-size:0.7rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--gray-400)">Mitgliedschaften & Partner</span>
        <div style="display:flex;align-items:center;gap:2.5rem;flex-wrap:wrap">
          <img src="../Bilder/logo-svit.svg" alt="SVIT Aargau" style="height:36px;opacity:0.55;filter:grayscale(100%)" loading="lazy" />
          <img src="../Bilder/logo-propbase.png" alt="PropBase" style="height:32px;opacity:0.55;filter:grayscale(100%)" loading="lazy" />
        </div>
      </div>
      <div class="footer__bottom">
        <span class="footer__copy">© 2025 CORA Immobilien GmbH. Alle Rechte vorbehalten.</span>
        <div class="footer__legal">
          <a href="/impressum" class="footer__legal-link">Impressum</a>
          <a href="/datenschutz" class="footer__legal-link">Datenschutz</a>
        </div>
      </div>
    </div>
  </footer>`;

const WHATSAPP_HTML = `
  <a href="https://wa.me/41565520130" class="whatsapp-btn" target="_blank" rel="noopener" aria-label="WhatsApp">
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.852L.057 23.5l5.797-1.452A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.853 0-3.601-.5-5.112-1.373l-.364-.217-3.44.862.92-3.353-.237-.38A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
    <span>WhatsApp</span>
  </a>`;

const NAV_SCRIPT = `
  <script>
    const toggle = document.getElementById('navToggle');
    const mobile = document.getElementById('navMobile');
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      mobile.classList.toggle('open');
    });
    mobile.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        toggle.classList.remove('open');
        mobile.classList.remove('open');
      });
    });
  </script>`;

function buildHead({ title, description, canonical, ogType = 'article', ogImage = `${SITE_URL}/og-image.png` }) {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)} – CORA Immobilien</title>
  <meta name="description" content="${escAttr(description)}" />
  <link rel="canonical" href="${canonical}">
  <meta name="robots" content="index, follow">
  <meta property="og:type" content="${ogType}">
  <meta property="og:title" content="${escAttr(title)} – CORA Immobilien">
  <meta property="og:description" content="${escAttr(description)}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:locale" content="de_CH">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escAttr(title)} – CORA Immobilien">
  <meta name="twitter:description" content="${escAttr(description)}">
  <meta name="twitter:image" content="${ogImage}">
  <link rel="icon" href="../favicon/favicon.ico" sizes="any">
  <link rel="icon" href="../favicon/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="../favicon/apple-touch-icon.png">
  <meta name="theme-color" content="#111111">
  <link rel="stylesheet" href="../styles.css" />
  ${BLOG_CSS}
  <script defer src="https://cloud.umami.is/script.js" data-website-id="ec4c3c5c-b059-4c28-a81c-5f80d1fe6c99"></script>
</head>
<body>`;
}

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escAttr(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function generatePostPage(post) {
  const f = post.fields;
  // Field ID may be "titel" (German display name) — check Contentful → Edit field → Field ID
  const titel = f.titel || f.title || 'Ohne Titel';
  const slug = f.slug;
  const bodyHtml = f.body ? documentToHtmlString(f.body) : '';
  const dateStr = formatDate(f.publishedAt);
  const author = f.author || '';
  const excerpt = f.excerpt || '';
  const metaDesc = f.metaDescription || excerpt || titel;
  const heroAsset = Array.isArray(f.heroImage) ? f.heroImage[0] : f.heroImage;
  const heroUrl = heroAsset?.fields?.file?.url ? `https:${heroAsset.fields.file.url}` : null;
  const canonical = `${SITE_URL}/blog/${slug}.html`;
  const ogImage = heroUrl || `${SITE_URL}/og-image.png`;

  const meta = [dateStr, author].filter(Boolean).join(' · ');

  return `${buildHead({ title: titel, description: metaDesc, canonical, ogType: 'article', ogImage })}

${NAV_HTML}

<main>
  <section class="hero-full" style="min-height:55svh">
    ${heroUrl
      ? `<img class="hero-full__bg" src="${heroUrl}" alt="${escAttr(titel)}" />`
      : `<div class="hero-full__bg" style="background:var(--cora-blue)"></div>`
    }
    <div class="hero-full__overlay"></div>
    <div class="hero-full__content">
      <div class="label" style="color:rgba(255,255,255,0.65);margin-bottom:1rem">
        <a href="/blog" style="color:inherit;text-decoration:none">← Blog</a>
      </div>
      <h1 class="hero-full__title" style="font-size:clamp(1.8rem,4vw,3rem)">${escHtml(titel)}</h1>
      ${meta ? `<p class="hero-full__subtitle" style="font-size:0.9rem;opacity:0.7;margin-top:0.5rem">${escHtml(meta)}</p>` : ''}
    </div>
  </section>

  <section class="section">
    <div class="container" style="max-width:760px">
      <article class="blog-body">
        ${bodyHtml}
      </article>
      <div style="margin-top:3rem;padding-top:2rem;border-top:1px solid var(--gray-200)">
        <a href="/blog" style="font-size:0.9rem;font-weight:600;color:var(--cora-blue)">← Zurück zur Übersicht</a>
      </div>
    </div>
  </section>
</main>

${WHATSAPP_HTML}
${FOOTER_HTML}
${NAV_SCRIPT}

</body>
</html>`;
}

function generateIndexPage(posts) {
  const cards = posts.map(post => {
    const f = post.fields;
    const titel = f.titel || f.title || 'Ohne Titel';
    const slug = f.slug;
    const excerpt = f.excerpt || '';
    const dateStr = formatDate(f.publishedAt);
    const heroAsset = Array.isArray(f.heroImage) ? f.heroImage[0] : f.heroImage;
    const heroUrl = heroAsset?.fields?.file?.url ? `https:${heroAsset.fields.file.url}` : null;

    return `
    <a href="/blog/${slug}.html" class="blog-card">
      ${heroUrl
        ? `<div class="blog-card__img" style="background-image:url('${heroUrl}')"></div>`
        : `<div class="blog-card__img blog-card__img--placeholder"></div>`
      }
      <div class="blog-card__body">
        ${dateStr ? `<div class="label">${escHtml(dateStr)}</div>` : ''}
        <h2 class="blog-card__title">${escHtml(titel)}</h2>
        ${excerpt ? `<p class="blog-card__excerpt">${escHtml(excerpt)}</p>` : ''}
        <span class="blog-card__link">Lesen <span class="arrow">→</span></span>
      </div>
    </a>`;
  }).join('\n');

  return `${buildHead({
    title: 'Blog',
    description: 'Wissenswertes rund um Immobilien in der Schweiz – Tipps, Einblicke und News von CORA Immobilien.',
    canonical: `${SITE_URL}/blog/`,
    ogType: 'website',
  })}

${NAV_HTML}

<main>
  <section class="section" style="padding-top:calc(80px + 3rem)">
    <div class="container">
      <div class="section__header">
        <div class="label section__label">Blog</div>
        <h1 class="section__title">Wissen rund um Immobilien</h1>
        <p class="section__text">Tipps, Einblicke und Neuigkeiten aus der Welt der Immobilien.</p>
      </div>
      <div class="blog-grid">
        ${cards || '<p style="color:var(--gray-400)">Noch keine Beiträge vorhanden.</p>'}
      </div>
    </div>
  </section>
</main>

${WHATSAPP_HTML}
${FOOTER_HTML}
${NAV_SCRIPT}

</body>
</html>`;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const res = await client.getEntries({
    content_type: CONTENT_TYPE,
    order: '-fields.publishedAt',
    limit: 200,
  });

  console.log(`${res.items.length} Posts geladen.`);

  for (const post of res.items) {
    const slug = post.fields.slug;
    if (!slug) {
      console.warn('Post ohne slug übersprungen:', post.sys.id);
      continue;
    }
    const html = generatePostPage(post);
    fs.writeFileSync(path.join(OUT_DIR, `${slug}.html`), html, 'utf-8');
    console.log(`  → ${slug}.html`);
  }

  const indexHtml = generateIndexPage(res.items);
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), indexHtml, 'utf-8');
  console.log('  → index.html');

  // Sitemap für Blog-Posts
  const today = new Date().toISOString().split('T')[0];
  const sitemapUrls = [
    `  <url>\n    <loc>${SITE_URL}/blog/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`,
    ...res.items.map(post => {
      const slug = post.fields.slug;
      const date = post.fields.publishedAt ? post.fields.publishedAt.split('T')[0] : today;
      return `  <url>\n    <loc>${SITE_URL}/blog/${slug}.html</loc>\n    <lastmod>${date}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`;
    }),
  ];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.join('\n')}\n</urlset>\n`;
  fs.writeFileSync(path.join(OUT_DIR, 'sitemap.xml'), sitemap, 'utf-8');
  console.log('  → sitemap.xml');
  console.log('Fertig.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
