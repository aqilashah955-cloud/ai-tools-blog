/* AI Tools Blog — small client-side renderer.
   No build step, no backend. Articles are Markdown files in articles/
   with front matter; articles/index.json lists the slugs to publish.
   Only articles with status: published are ever listed or linked. */

'use strict';

/* ---------- pure functions (no DOM) ---------- */

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inlineMd(s) {
  var out = escapeHtml(s);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, '<a href="$2">$1</a>');
  return out;
}

function parseFrontMatter(text) {
  var meta = {};
  var body = text;
  if (text.indexOf('---') === 0) {
    var end = text.indexOf('\n---', 3);
    if (end !== -1) {
      var raw = text.slice(3, end).replace(/^\n/, '');
      body = text.slice(end + 4).replace(/^\n/, '');
      raw.split('\n').forEach(function (line) {
        var i = line.indexOf(':');
        if (i > 0) {
          var key = line.slice(0, i).trim();
          var val = line.slice(i + 1).trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
          meta[key] = val;
        }
      });
    }
  }
  return { meta: meta, body: body };
}

function parseMarkdown(md) {
  var lines = md.split('\n');
  var html = '';
  var i = 0;

  function isTableRow(l) { return /^\s*\|.*\|\s*$/.test(l); }
  function isSepRow(l) { return /^\s*\|[\s:|-]+\|\s*$/.test(l) && /-/.test(l); }
  function tableCells(l) {
    return l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); });
  }

  while (i < lines.length) {
    var line = lines[i];

    if (!line.trim()) { i++; continue; }

    var h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      html += '<h' + h[1].length + '>' + inlineMd(h[2]) + '</h' + h[1].length + '>\n';
      i++;
      continue;
    }

    if (/^\s*---+\s*$/.test(line) || /^\s*\*\*\*+\s*$/.test(line)) {
      html += '<hr>\n'; i++; continue;
    }

    if (/^>\s?/.test(line)) {
      var q = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, '')); i++; }
      html += '<blockquote>' + q.map(function (l) { return '<p>' + inlineMd(l) + '</p>'; }).join('') + '</blockquote>\n';
      continue;
    }

    if (isTableRow(line) && i + 1 < lines.length && isSepRow(lines[i + 1])) {
      var head = tableCells(line);
      var rows = [];
      i += 2;
      while (i < lines.length && isTableRow(lines[i])) { rows.push(tableCells(lines[i])); i++; }
      html += '<table>\n<thead><tr>' + head.map(function (c) { return '<th>' + inlineMd(c) + '</th>'; }).join('') + '</tr></thead>\n<tbody>\n';
      rows.forEach(function (r) {
        html += '<tr>' + r.map(function (c) { return '<td>' + inlineMd(c) + '</td>'; }).join('') + '</tr>\n';
      });
      html += '</tbody>\n</table>\n';
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      var items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, '')); i++;
      }
      html += '<ul>\n' + items.map(function (t) { return '<li>' + inlineMd(t) + '</li>'; }).join('\n') + '\n</ul>\n';
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      var items2 = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items2.push(lines[i].replace(/^\s*\d+[.)]\s+/, '')); i++;
      }
      html += '<ol>\n' + items2.map(function (t) { return '<li>' + inlineMd(t) + '</li>'; }).join('\n') + '\n</ol>\n';
      continue;
    }

    var para = [];
    while (i < lines.length && lines[i].trim() !== '' &&
           !/^(#{1,6})\s/.test(lines[i]) && !isTableRow(lines[i]) &&
           !/^\s*[-*]\s+/.test(lines[i]) && !/^\s*\d+[.)]\s+/.test(lines[i]) &&
           !/^>\s?/.test(lines[i]) && !/^\s*---+\s*$/.test(lines[i])) {
      para.push(lines[i].trim());
      i++;
    }
    if (para.length) html += '<p>' + inlineMd(para.join(' ')) + '</p>\n';
  }
  return html;
}

function readingTime(text) {
  var words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

function formatDate(iso) {
  var d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return iso;
  var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

function articleUrl(slug) { return 'articles/' + slug; }

/* ---------- data loading ---------- */

function fetchArticle(slug) {
  return fetch('articles/' + slug + '.md')
    .then(function (r) { if (!r.ok) throw new Error('Article not found: ' + slug); return r.text(); })
    .then(function (text) {
      var parsed = parseFrontMatter(text);
      parsed.meta.slug = parsed.meta.slug || slug;
      parsed.meta.readingMins = readingTime(parsed.body);
      parsed.body = parsed.body;
      return parsed;
    });
}

function loadPublished() {
  return fetch('articles/index.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      return Promise.all((data.articles || []).map(fetchArticle));
    })
    .then(function (list) {
      return list
        .filter(function (a) { return (a.meta.status || '').toLowerCase() === 'published'; })
        .sort(function (a, b) { return (b.meta.date || '').localeCompare(a.meta.date || ''); });
    });
}

function getSlug() {
  var params = new URLSearchParams(window.location.search);
  var q = params.get('slug');
  if (q) return q;
  var m = window.location.pathname.match(/\/articles\/([^\/?.#]+)/);
  if (m) return m[1].replace(/\.html$/, '');
  return null;
}

function cardHtml(a) {
  var m = a.meta;
  return '<li class="post-card">' +
    '<h3><a href="' + articleUrl(m.slug) + '">' + escapeHtml(m.title) + '</a></h3>' +
    '<p>' + escapeHtml(m.excerpt || '') + '</p>' +
    '<p class="post-meta"><a class="chip" href="blog.html?category=' + encodeURIComponent(m.category) + '">' + escapeHtml(m.category) + '</a>' +
    '<span>' + escapeHtml(formatDate(m.date)) + '</span><span>' + m.readingMins + ' min read</span></p>' +
    '</li>';
}

/* ---------- page wiring (DOM) ---------- */

function initNewsletterForms() {
  document.querySelectorAll('form.newsletter').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = form.querySelector('.form-status');
      if (status) {
        status.hidden = false;
        status.textContent = 'Thanks for signing up! Newsletter delivery is not connected yet, so your address was not saved. Once email is set up, this form will store subscribers.';
      }
      form.reset();
    });
  });
}

function initContactForm() {
  var form = document.querySelector('form.contact-form');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = form.querySelector('#contact-name').value.trim();
    var email = form.querySelector('#contact-email').value.trim();
    var message = form.querySelector('#contact-message').value.trim();
    var subject = encodeURIComponent('Blog contact from ' + (name || 'a reader'));
    var body = encodeURIComponent('Name: ' + name + '\nEmail: ' + email + '\n\n' + message);
    window.location.href = 'mailto:aqilashah955@gmail.com?subject=' + subject + '&body=' + body;
    var status = form.querySelector('.form-status');
    if (status) {
      status.hidden = false;
      status.textContent = 'Your email app should now open with the message ready to send.';
    }
  });
}

function initHome() {
  var featuredEl = document.getElementById('featured-list');
  var latestEl = document.getElementById('latest-list');
  if (!featuredEl && !latestEl) return;
  loadPublished().then(function (list) {
    if (featuredEl) featuredEl.innerHTML = list.slice(0, 1).map(cardHtml).join('') || '<li class="empty">No published tutorials yet — check back soon.</li>';
    if (latestEl) latestEl.innerHTML = list.map(cardHtml).join('') || '<li class="empty">No published tutorials yet — check back soon.</li>';
  }).catch(function () {
    if (featuredEl) featuredEl.innerHTML = '<li class="empty">Tutorials could not be loaded. Please try again.</li>';
    if (latestEl) latestEl.innerHTML = '<li class="empty">Tutorials could not be loaded. Please try again.</li>';
  });
}

function initBlog() {
  var listEl = document.getElementById('blog-list');
  if (!listEl) return;
  var searchInput = document.getElementById('blog-search');
  var params = new URLSearchParams(window.location.search);
  var activeCategory = params.get('category') || 'All';
  var query = params.get('q') || '';
  var all = [];

  if (searchInput) searchInput.value = query;

  function render() {
    var q = (searchInput ? searchInput.value : '').trim().toLowerCase();
    var shown = all.filter(function (a) {
      var m = a.meta;
      var hay = (m.title + ' ' + (m.excerpt || '') + ' ' + m.category + ' ' + a.body).toLowerCase();
      var okCat = activeCategory === 'All' || m.category === activeCategory;
      var okQ = !q || hay.indexOf(q) !== -1;
      return okCat && okQ;
    });
    listEl.innerHTML = shown.length
      ? shown.map(cardHtml).join('')
      : '<li class="empty">No tutorials match that search. Try a different word or category.</li>';
    document.querySelectorAll('.filter-btn').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.dataset.category === activeCategory));
    });
  }

  document.querySelectorAll('.filter-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      activeCategory = btn.dataset.category;
      render();
    });
  });
  if (searchInput) searchInput.addEventListener('input', render);

  loadPublished().then(function (list) {
    all = list;
    render();
  }).catch(function () {
    listEl.innerHTML = '<li class="empty">Tutorials could not be loaded. Please try again.</li>';
  });
}

function initArticle() {
  var root = document.getElementById('article-root');
  if (!root) return;
  var slug = getSlug();
  if (!slug) {
    root.innerHTML = '<p class="empty">No article selected. <a href="blog.html">Browse all tutorials</a>.</p>';
    return;
  }
  fetchArticle(slug).then(function (a) {
    if ((a.meta.status || '').toLowerCase() !== 'published') {
      root.innerHTML = '<p class="empty">This article is not published yet. <a href="blog.html">Browse all tutorials</a>.</p>';
      return;
    }
    var m = a.meta;
    document.title = m.title + ' — AI Tools Blog';
    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', m.description || m.excerpt || '');
    var html = '<p class="post-meta"><a class="chip" href="blog.html?category=' + encodeURIComponent(m.category) + '">' + escapeHtml(m.category) + '</a>' +
      '<span>' + escapeHtml(formatDate(m.date)) + '</span><span>' + m.readingMins + ' min read</span></p>' +
      parseMarkdown(a.body);
    if (m.video_url) {
      html += '<p><a class="video-link" href="' + escapeHtml(m.video_url) + '">▶ Watch the video version on YouTube</a></p>';
    }
    root.innerHTML = html;
  }).catch(function () {
    root.innerHTML = '<p class="empty">Sorry, this article could not be found. <a href="blog.html">Browse all tutorials</a>.</p>';
  });
}

document.addEventListener('DOMContentLoaded', function () {
  initNewsletterForms();
  initContactForm();
  initHome();
  initBlog();
  initArticle();
});
