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
      h.id = 'h-' + h.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
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
   MARKDOWN LOADER
   Loads a .md file and renders it into #md-content
   Usage: add data-md="path/to/file.md" on <div id="md-content">
   ============================================ */
async function loadMarkdown() {
  const el = document.getElementById('md-content');
  if (!el) return;

  const src = el.dataset.md;
  if (!src) return;

  try {
    const res = await fetch(src);
    if (!res.ok) throw new Error('Could not load ' + src);
    const text = await res.text();

    // marked must be loaded before main.js
    if (typeof marked === 'undefined') {
      el.innerHTML = '<p>Error: marked.js not loaded.</p>';
      return;
    }

    marked.setOptions({
      breaks: true,
      gfm: true,
    });

    el.innerHTML = marked.parse(text);

    // Update page title from first h1
    const h1 = el.querySelector('h1');
    if (h1) {
      document.querySelector('.post-title') && (document.querySelector('.post-title').textContent = h1.textContent);
      h1.remove(); // h1 is shown separately in the template header
    }

    // Build TOC after content is ready
    buildTOC(el, document.getElementById('toc'));

    // Activate any embedded workbenches
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