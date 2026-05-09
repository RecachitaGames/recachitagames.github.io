#!/usr/bin/env python3
"""
Build static HTML files from DevLog markdown.
Uses post.html template and style.css from the website repo.
Runs in recachitagames.github.io (NOT in logseq_pages).
"""

import os
import re
import sys
from pathlib import Path
from datetime import datetime

try:
    import markdown
    import yaml
except ImportError:
    print("ERROR: markdown and PyYAML required. Install with: pip install markdown PyYAML", file=sys.stderr)
    sys.exit(1)

JOURNAL_DIR = Path('./content/journal')
SITE_ROOT = Path('.')

def extract_frontmatter(md_content):
    """Extract YAML frontmatter if present"""
    if md_content.startswith('---'):
        try:
            _, fm, body = md_content.split('---', 2)
            return yaml.safe_load(fm) or {}, body
        except:
            return {}, md_content
    return {}, md_content

def extract_title(md_file):
    """Extract H1 title from markdown"""
    with open(md_file, 'r', encoding='utf-8') as f:
        for line in f:
            if line.startswith('# '):
                return line[2:].strip()
    return md_file.stem

def extract_date(filename):
    """Extract YYYY-MM from filename like 2026-05-08-Title.md"""
    match = re.match(r'(\d{4})-(\d{2})', filename)
    if match:
        return f"{match.group(1)}-{match.group(2)}"
    return datetime.now().strftime("%Y-%m")

def markdown_to_html_body(md_content):
    """Convert markdown to HTML body using marked-compatible output"""
    return markdown.markdown(md_content, extensions=['extra', 'tables', 'fenced_code', 'codehilite'])

def build_html_page(md_file):
    """Build HTML page from markdown file using post.html template structure"""

    md_content = md_file.read_text(encoding='utf-8')
    frontmatter, body = extract_frontmatter(md_content)

    title = frontmatter.get('title') or extract_title(md_file)
    date = frontmatter.get('date') or extract_date(md_file.name)

    # Convert markdown to HTML
    html_body = markdown_to_html_body(body)

    # Build complete HTML using post.html structure but with static content
    html = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title} - Recachita Games</title>

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=IBM+Plex+Serif:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../../style.css" />
  <link rel="icon" href="../../Recachita_Logo.jpg" type="image/jpeg">
  <link rel="apple-touch-icon" href="../../Recachita_Logo.jpg">
</head>
<body>

  <!-- SIDE PANEL -->
  <div class="panel-overlay" id="panel-overlay"></div>
  <nav class="side-panel" id="side-panel" aria-label="Navigation">
    <div class="panel-header">
      <span style="font-family:var(--font-display);font-size:0.75rem;color:var(--yellow);text-transform:uppercase;letter-spacing:0.1em;">Menu</span>
      <button class="panel-close" id="panel-close" aria-label="Close menu">✕</button>
    </div>

    <div class="panel-section">
      <div class="panel-section-label">Secciones</div>
      <div class="panel-nav">
        <a href="../../index.html">Inicio</a>
        <a href="../../about.html">Sobre nosotros</a>
      </div>
    </div>

    <div class="panel-section" id="toc-section">
      <div class="panel-section-label">This page</div>
      <div class="panel-toc" id="toc"></div>
    </div>
  </nav>

  <!-- HEADER -->
  <header class="site-header">
    <button class="burger-btn" id="burger-btn" aria-label="Open menu">
      <span></span><span></span><span></span>
    </button>
    <a href="../../index.html" class="site-title">Recachita Games</a>
  </header>

  <!-- MAIN -->
  <main class="site-wrapper">
    <div class="main-content">

      <div class="post-meta">
        <span id="post-section">DevLog</span>
        <span id="post-date">{date}</span>
      </div>

      <h1 class="post-title">{title}</h1>
      <div class="post-divider"></div>

      <!-- Content -->
      <div id="md-content">
        {html_body}
      </div>

    </div>

    <footer class="site-footer">
      <a href="../../index.html">← Volver</a> &nbsp;&nbsp; Recachita Games &mdash; <span id="year"></span>
    </footer>
  </main>

  <script>
    // Build TOC from headings
    function buildTOC() {{
      const contentEl = document.getElementById('md-content');
      const tocEl = document.getElementById('toc');
      if (!tocEl || !contentEl) return;

      const headings = contentEl.querySelectorAll('h2, h3, h4');
      const tocSection = document.getElementById('toc-section');

      if (headings.length === 0) {{
        if (tocSection) tocSection.style.display = 'none';
        return;
      }}
      if (tocSection) tocSection.style.display = '';

      const seen = {{}};
      headings.forEach((h, i) => {{
        if (!h.id) {{
          let slug = slugify(h.textContent);
          if (seen[slug]) slug += '-' + i;
          seen[slug] = true;
          h.id = slug;
        }}
        const a = document.createElement('a');
        a.href = '#' + h.id;
        a.textContent = h.textContent;
        a.className = 'toc-' + h.tagName.toLowerCase();
        tocEl.appendChild(a);
      }});
    }}

    function slugify(text) {{
      const map = {{ a:'áàäâãå', e:'éèëê', i:'íìïî', o:'óòöôõø', u:'úùüû', n:'ñ', c:'ç' }};
      let s = text.trim().toLowerCase();
      for (const [base, chars] of Object.entries(map)) {{
        s = s.replace(new RegExp('[' + chars + ']', 'g'), base);
      }}
      return s.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'section';
    }}

    // Burger menu
    const burgerBtn = document.getElementById('burger-btn');
    const sidePanel = document.getElementById('side-panel');
    const overlay = document.getElementById('panel-overlay');
    const panelClose = document.getElementById('panel-close');

    function openPanel() {{
      sidePanel.classList.add('open');
      overlay.classList.add('open');
      burgerBtn.classList.add('open');
    }}

    function closePanel() {{
      sidePanel.classList.remove('open');
      overlay.classList.remove('open');
      burgerBtn.classList.remove('open');
    }}

    burgerBtn?.addEventListener('click', () =>
      sidePanel.classList.contains('open') ? closePanel() : openPanel()
    );
    overlay?.addEventListener('click', closePanel);
    panelClose?.addEventListener('click', closePanel);

    buildTOC();
    document.getElementById('year').textContent = new Date().getFullYear();
  </script>
</body>
</html>"""

    return html

def update_index_html(links):
    """Update index.html with links to devlog entries"""
    index_html = SITE_ROOT / 'index.html'

    if not index_html.exists():
        print(f"WARNING: index.html not found at {index_html}", file=sys.stderr)
        return

    content = index_html.read_text(encoding='utf-8')

    # Build link list pointing to static HTML files
    link_html = '\n'.join([
        f'          <li>\n'
        f'            <a href="content/journal/{html_name}">{title}</a>\n'
        f'            <span class="post-date">{date}</span>\n'
        f'          </li>'
        for html_name, title, date in links
    ])

    # Replace content in devlog-list
    pattern = r'(<ul[^>]*id="devlog-list"[^>]*>)([\s\S]*?)(</ul>)'
    match = re.search(pattern, content)
    if match:
        print(f"Updating devlog-list in index.html", file=sys.stderr)
        content = re.sub(
            pattern,
            rf'\1\n{link_html}\n        \3',
            content,
            count=1
        )
    else:
        print(f"WARNING: Could not find devlog-list in index.html", file=sys.stderr)

    index_html.write_text(content, encoding='utf-8')

def main():
    if not JOURNAL_DIR.exists():
        print(f"ERROR: {JOURNAL_DIR} not found", file=sys.stderr)
        return 1

    md_files = sorted(JOURNAL_DIR.glob('*.md'), reverse=True)
    print(f"Found {len(md_files)} markdown files", file=sys.stderr)

    links = []
    for md_file in md_files:
        print(f"Processing: {md_file.name}", file=sys.stderr)

        title = extract_title(md_file)
        date = extract_date(md_file.name)
        html_name = md_file.stem + '.html'

        # Generate HTML
        html_content = build_html_page(md_file)
        html_dest = JOURNAL_DIR / html_name
        html_dest.write_text(html_content, encoding='utf-8')

        print(f"  → {html_name}", file=sys.stderr)
        links.append((html_name, title, date))

    # Update index.html
    if links:
        update_index_html(links)
        print(f"Updated index.html with {len(links)} entries", file=sys.stderr)

    return 0

if __name__ == '__main__':
    sys.exit(main())
