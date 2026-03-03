/* ============================================
   SIDE PANEL / BURGER MENU
   ============================================ */
const burgerBtn   = document.getElementById('burger-btn');
const sidePanel   = document.getElementById('side-panel');
const overlay     = document.getElementById('panel-overlay');
const panelClose  = document.getElementById('panel-close');

function openPanel() {
  sidePanel.classList.add('open');
  overlay.classList.add('open');
  burgerBtn.classList.add('open');
}

function closePanel() {
  sidePanel.classList.remove('open');
  overlay.classList.remove('open');
  burgerBtn.classList.remove('open');
}

burgerBtn.addEventListener('click', () => {
  sidePanel.classList.contains('open') ? closePanel() : openPanel();
});

overlay.addEventListener('click', closePanel);
panelClose.addEventListener('click', closePanel);

// Close on nav click
document.querySelectorAll('.panel-nav a').forEach(a => {
  a.addEventListener('click', closePanel);
});

// Mark active nav link
(function markActiveNav() {
  const path = window.location.pathname;
  document.querySelectorAll('.panel-nav a').forEach(a => {
    const href = a.getAttribute('href');
    if (href && path.includes(href) && href !== '/' && href !== '/index.html') {
      a.classList.add('active');
    }
  });
})();

/* ============================================
   SLUGIFY — accent-safe anchor IDs
   ============================================ */
function slugify(text) {
  const accents = { a:'áàäâã', e:'éèëê', i:'íìïî', o:'óòöôõ', u:'úùüû', n:'ñ', c:'ç' };
  let s = text.trim().toLowerCase();
  for (const [base, chars] of Object.entries(accents)) {
    s = s.replace(new RegExp('[' + chars + ']', 'g'), base);
  }
  return s.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'section';
}

/* ============================================
   TABLE OF CONTENTS
   ============================================ */
function buildTOC(contentEl, tocEl) {
  if (!tocEl || !contentEl) return;

  const headings = contentEl.querySelectorAll('h2, h3, h4');
  const section = document.getElementById('toc-section');
  if (headings.length === 0) {
    if (section) section.style.display = 'none';
    return;
  }
  if (section) section.style.display = '';

  const frag = document.createDocumentFragment();

  headings.forEach((h, i) => {
    // Ensure heading has an id
    if (!h.id) {
      h.id = slugify(h.textContent);
      // Deduplicate
      const same = document.querySelectorAll('#' + CSS.escape(h.id));
      if (same.length > 1) h.id += '-' + i;
    }

    const a = document.createElement('a');
    a.href = '#' + h.id;
    a.textContent = h.textContent;
    a.className = 'toc-' + h.tagName.toLowerCase();
    a.addEventListener('click', closePanel);
    frag.appendChild(a);
  });

  tocEl.appendChild(frag);
}

/* ============================================
   FRONTMATTER PARSER
   ============================================ */
function parseFrontmatter(text) {
  const meta = {};
  let body = text;
  if (text.startsWith('---')) {
    const end = text.indexOf('\n---', 3);
    if (end !== -1) {
      const block = text.slice(3, end).trim();
      block.split('\n').forEach(line => {
        const colon = line.indexOf(':');
        if (colon === -1) return;
        const key = line.slice(0, colon).trim();
        const val = line.slice(colon + 1).trim().replace(/^['"]|['"]$/g, '');
        meta[key] = val;
      });
      body = text.slice(end + 4).trimStart();
    }
  }
  return { meta, body };
}

function inferSection(src) {
  const parts = src.split('/');
  if (parts.length >= 2) {
    const s = parts[parts.length - 2];
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  return '';
}

/* ============================================
   MARKDOWN LOADER
   ============================================ */
async function loadMarkdown() {
  const el = document.getElementById('md-content');
  if (!el) return;
  const src = el.dataset.md;
  if (!src) return;

  try {
    const res = await fetch(src);
    if (!res.ok) throw new Error('Could not load ' + src);
    const raw = await res.text();

    if (typeof marked === 'undefined') {
      el.innerHTML = '<p>Error: marked.js not loaded.</p>';
      return;
    }

    const { meta, body } = parseFrontmatter(raw);

    // Fill post-meta fields
    const sectionEl = document.getElementById('post-section');
    const dateEl    = document.getElementById('post-date');
    if (sectionEl) sectionEl.textContent = meta.section || inferSection(src);
    if (dateEl)    dateEl.textContent    = meta.date    || '';

    // Protect <textarea> content from marked before parsing
    const textareas = [];
    const safeBody = body.replace(
      /<textarea([^>]*)>([\s\S]*?)<\/textarea>/gi,
      (match, attrs, content) => {
        const idx = textareas.length;
        textareas.push(content);
        return '<textarea' + attrs + ' data-ph="' + idx + '"></textarea>';
      }
    );

    marked.setOptions({ breaks: false, gfm: true, html: true });
    el.innerHTML = marked.parse(safeBody);

    // Restore textarea values (.value avoids HTML interpretation)
    el.querySelectorAll('textarea[data-ph]').forEach(ta => {
      const idx = parseInt(ta.dataset.ph, 10);
      ta.value = textareas[idx].replace(/^\n/, '');
      ta.removeAttribute('data-ph');
    });

    // Title: frontmatter title > first h1
    const titleEl = document.querySelector('.post-title');
    if (meta.title) {
      if (titleEl) titleEl.textContent = meta.title;
      document.title = meta.title + ' — Sith';
    } else {
      const h1 = el.querySelector('h1');
      if (h1) {
        if (titleEl) titleEl.textContent = h1.textContent;
        document.title = h1.textContent + ' — Sith';
        h1.remove();
      }
    }

    buildTOC(el, document.getElementById('toc'));
    initWorkbenches();

  } catch (e) {
    el.innerHTML = '<p style="color:#ff6b6b">Failed to load content: ' + e.message + '</p>';
  }
}

/* ============================================
   PYODIDE WORKBENCHES
   Looks for .workbench elements with a textarea and run button.
   Lazily loads Pyodide on first run.
   ============================================ */
let pyodide = null;
let pyodideLoading = false;
let pyodideCallbacks = [];

async function getPyodide() {
  if (pyodide) return pyodide;

  return new Promise((resolve, reject) => {
    pyodideCallbacks.push({ resolve, reject });

    if (!pyodideLoading) {
      pyodideLoading = true;

      // Load Pyodide script dynamically
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js';
      script.onload = async () => {
        try {
          pyodide = await loadPyodide();
          pyodideCallbacks.forEach(cb => cb.resolve(pyodide));
          pyodideCallbacks = [];
        } catch (e) {
          pyodideCallbacks.forEach(cb => cb.reject(e));
          pyodideCallbacks = [];
        }
      };
      script.onerror = (e) => {
        pyodideCallbacks.forEach(cb => cb.reject(new Error('Failed to load Pyodide')));
        pyodideCallbacks = [];
      };
      document.head.appendChild(script);
    }
  });
}

function initWorkbenches() {
  document.querySelectorAll('.workbench').forEach(wb => {
    if (wb.dataset.initialized) return;
    wb.dataset.initialized = 'true';

    const btn    = wb.querySelector('.workbench-run');
    const code   = wb.querySelector('.workbench-code');
    const output = wb.querySelector('.workbench-output');

    if (!btn || !code || !output) return;

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Loading…';
      output.className = 'workbench-output';
      output.textContent = 'Initializing Python runtime…';

      try {
        const py = await getPyodide();
        btn.textContent = 'Running…';

        // Capture stdout
        py.runPython(`
import sys, io
_stdout_capture = io.StringIO()
sys.stdout = _stdout_capture
        `);

        try {
          py.runPython(code.value);
          const captured = py.runPython('_stdout_capture.getvalue()');
          output.textContent = captured || '(no output)';
          output.className = 'workbench-output has-output';
        } catch (err) {
          output.textContent = err.message;
          output.className = 'workbench-output error';
        } finally {
          py.runPython('sys.stdout = sys.__stdout__');
        }

      } catch (e) {
        output.textContent = 'Error: ' + e.message;
        output.className = 'workbench-output error';
      }

      btn.textContent = 'Run';
      btn.disabled = false;
    });
  });
}

/* ============================================
   INIT
   ============================================ */
document.addEventListener('DOMContentLoaded', async () => {
  await loadMarkdown();

  // For static pages (not markdown-loaded), still build TOC
  const content = document.getElementById('md-content') || document.getElementById('static-content');
  if (content && !content.dataset.md) {
    buildTOC(content, document.getElementById('toc'));
    initWorkbenches();
  }
});