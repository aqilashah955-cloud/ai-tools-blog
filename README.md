# AI Tools Blog

A static, beginner-friendly blog about AI tools, AI automation, content writing, and productivity. Plain HTML/CSS/JS — no build step, no backend, no database. Fast to load, responsive on mobile and desktop, and accessible (semantic HTML, labelled form fields, visible focus states).

## How the site is put together

- `index.html` — homepage: hero, topic cards, featured + latest tutorials, newsletter signup.
- `blog.html` — blog listing with client-side search and category filters.
- `article.html` — template that renders one article from its Markdown file.
- `about.html`, `contact.html` — About and Contact pages.
- `articles/` — one Markdown file per article, with front matter (title, slug, category, excerpt, description, date, status, optional video_url). `articles/index.json` lists the slugs of published articles — it is the only list the site reads.
- `assets/style.css` — the whole design (system fonts only).
- `assets/app.js` — the Markdown renderer, search/filter, and form behaviour.
- `vercel.json` — Vercel rewrites so articles open at clean URLs: `/articles/<slug>`.

## How to publish a new article

1. Copy any file in `articles/` to a new file, e.g. `articles/my-new-tutorial.md`.
2. Edit its front matter:
   - `title`, `slug` (lowercase, words separated by `-`), `category` (one of: AI Tools, AI Automation, Content Writing, Productivity)
   - `excerpt` (one or two sentences, shown on cards), `description` (the meta description for search engines)
   - `date` (YYYY-MM-DD), `status: published` — or `status: draft` to keep it unpublished
   - `video_url` (optional — adds a "Watch the video version" link)
3. Write the article in Markdown below the front matter (`#` headings, `**bold**`, lists, tables, and links all work).
4. Add the slug to `articles/index.json` (one line in the `articles` list).
5. Commit and push — Vercel rebuilds and deploys automatically.

To unpublish an article, set `status: draft` in its front matter (or remove its slug from `index.json`). Draft files stay in the repo but are never linked or listed anywhere on the site.

## How the site goes live (GitHub → Vercel)

1. Create a GitHub repository (for example `ai-tools-blog`) and push this folder to it. The repository must be created by the owner first — the assistant does not create repos or push on its own.
2. In Vercel, choose **Add New → Project**, import the GitHub repository, and deploy. No build command and no output directory are needed — this is a plain static site. Vercel serves it at a `*.vercel.app` address automatically.
3. Every later push to the repository's main branch redeploys the site automatically.

## What the private artifact CMS does and does not do

The blog also exists as a private app with a browser CMS (the "AI Tools Blog" artifact), where articles can be written and published without touching files. That CMS does **not** travel to static hosting: Vercel serves files only, so there is no database for drafts, subscribers, or contact messages.

That means:

- **Publishing on the live site happens by adding/editing article files** as described above (the assistant does this on the owner's request).
- **The newsletter form** shows a signup box, but signups are not stored until an email service is connected. The form says so honestly on the page. To collect subscribers for real, connect a newsletter service (for example Buttondown, Mailchimp, or ConvertKit) and point the form at it.
- **The contact form** opens the visitor's own email app addressed to aqilashah955@gmail.com — nothing is stored on the site.

## Content rules

- No invented testimonials, statistics, user counts, or earnings claims anywhere on the site.
- Figures in the launch article (free AI voice generators) were verified against the tools' official pricing pages on 24 October 2026. Free tiers change without warning — re-check every figure against the official pricing page before re-publishing.
