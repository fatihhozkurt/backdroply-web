# Backdroply Web

React + Tailwind frontend for the Backdroply SaaS product.

## Scope

- Landing page (before/after comparison, onboarding flow)
- Studio page (image/video background removal workflow)
- Contact page (`/contact`) with support/KVKK request form
- Google sign-in (web), token display, history/my-media UI
- Cookie consent and legal links
- TR/EN language switch

## Tech Stack

- React 19
- Vite 7
- Tailwind CSS 4
- Framer Motion
- @react-oauth/google

## Local Development

```bash
npm install
npm run dev
```

Default URL: `http://localhost:5173`

## Environment

Main variables (via `.env` / Docker):

- `VITE_API_BASE_URL` (example: `http://localhost:8080/api/v1`)
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_APP_NAME` (default: `Backdroply`)
- `VITE_SITE_URL` (canonical base, default: `https://backdroply.com`)

## SEO Notes

- Route-based SEO head manager is active (`title`, `description`, `canonical`, `og:*`, `twitter:*`, `robots`).
- `hreflang` alternates are generated for TR/EN on indexed pages.
- `public/robots.txt`, `public/sitemap.xml`, and `public/site.webmanifest` are included.
- Legal pages have static SEO-friendly metadata and language-aware canonical URLs.

## Production Build

```bash
npm run build
npm run preview
```
