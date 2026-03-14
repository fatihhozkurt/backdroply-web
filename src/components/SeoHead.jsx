import { useEffect } from "react";

const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://backdroply.com").replace(/\/+$/, "");
const DEFAULT_IMAGE_URL = `${SITE_URL}/samples/sample-image-after.jpg`;

function upsertMeta(selector, attrs) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("data-seo-managed", "1");
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([key, value]) => {
    if (value == null || value === "") {
      el.removeAttribute(key);
      return;
    }
    el.setAttribute(key, value);
  });
}

function upsertLink(selector, attrs) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("data-seo-managed", "1");
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([key, value]) => {
    if (value == null || value === "") {
      el.removeAttribute(key);
      return;
    }
    el.setAttribute(key, value);
  });
}

function toAbsoluteUrl(path) {
  if (!path) {
    return `${SITE_URL}/`;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function withLang(url, lang) {
  const parsed = new URL(url);
  parsed.searchParams.set("lang", lang);
  return parsed.toString();
}

function upsertJsonLd(jsonLd) {
  const id = "seo-jsonld-primary";
  let scriptEl = document.head.querySelector(`script#${id}`);
  if (!scriptEl) {
    scriptEl = document.createElement("script");
    scriptEl.type = "application/ld+json";
    scriptEl.id = id;
    scriptEl.setAttribute("data-seo-managed", "1");
    document.head.appendChild(scriptEl);
  }
  scriptEl.textContent = JSON.stringify(jsonLd);
}

export default function SeoHead({
  lang = "tr",
  title,
  description,
  path = "/",
  image = DEFAULT_IMAGE_URL,
  imageAlt,
  robots = "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
  jsonLd
}) {
  useEffect(() => {
    const canonicalUrl = toAbsoluteUrl(path);
    const imageUrl = toAbsoluteUrl(image);
    const locale = lang === "tr" ? "tr_TR" : "en_US";
    const localeAlternate = lang === "tr" ? "en_US" : "tr_TR";
    const ogImageAlt = imageAlt || title;

    document.documentElement.lang = lang;
    document.title = title;

    upsertMeta('meta[name="description"]', { name: "description", content: description });
    upsertMeta('meta[name="robots"]', { name: "robots", content: robots });

    upsertMeta('meta[property="og:type"]', { property: "og:type", content: "website" });
    upsertMeta('meta[property="og:site_name"]', { property: "og:site_name", content: "Backdroply" });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: title });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: description });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl });
    upsertMeta('meta[property="og:image"]', { property: "og:image", content: imageUrl });
    upsertMeta('meta[property="og:image:alt"]', { property: "og:image:alt", content: ogImageAlt });
    upsertMeta('meta[property="og:locale"]', { property: "og:locale", content: locale });
    upsertMeta('meta[property="og:locale:alternate"]', {
      property: "og:locale:alternate",
      content: localeAlternate
    });

    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: title });
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: description });
    upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: imageUrl });
    upsertMeta('meta[name="twitter:url"]', { name: "twitter:url", content: canonicalUrl });

    upsertLink('link[rel="canonical"]', { rel: "canonical", href: canonicalUrl });
    upsertLink('link[rel="alternate"][hreflang="tr"]', {
      rel: "alternate",
      hreflang: "tr",
      href: withLang(canonicalUrl, "tr")
    });
    upsertLink('link[rel="alternate"][hreflang="en"]', {
      rel: "alternate",
      hreflang: "en",
      href: withLang(canonicalUrl, "en")
    });
    upsertLink('link[rel="alternate"][hreflang="x-default"]', {
      rel: "alternate",
      hreflang: "x-default",
      href: canonicalUrl
    });

    if (jsonLd) {
      upsertJsonLd(jsonLd);
    }
  }, [description, image, imageAlt, jsonLd, lang, path, robots, title]);

  return null;
}
