import { cleanup, render } from "@testing-library/react";
import SeoHead from "../components/SeoHead";

describe("SeoHead", () => {
  beforeEach(() => {
    document.head.querySelectorAll("[data-seo-managed='1']").forEach((node) => node.remove());
    document.title = "";
    document.documentElement.lang = "tr";
  });

  afterEach(() => {
    cleanup();
  });

  it("writes canonical, hreflang and social tags", () => {
    render(
      <SeoHead
        lang="en"
        path="/studio"
        title="Backdroply Studio"
        description="Premium background removal"
        image="/samples/sample-image-after.jpg"
        imageAlt="Backdroply sample"
      />
    );

    expect(document.documentElement.lang).toBe("en");
    expect(document.title).toBe("Backdroply Studio");
    expect(document.head.querySelector("link[rel='canonical']")?.getAttribute("href"))
      .toBe("https://backdroply.com/studio");
    expect(document.head.querySelector("link[rel='alternate'][hreflang='tr']")?.getAttribute("href"))
      .toBe("https://backdroply.com/studio?lang=tr");
    expect(document.head.querySelector("link[rel='alternate'][hreflang='en']")?.getAttribute("href"))
      .toBe("https://backdroply.com/studio?lang=en");
    expect(document.head.querySelector("meta[property='og:image:alt']")?.getAttribute("content"))
      .toBe("Backdroply sample");
    expect(document.head.querySelector("meta[name='twitter:url']")?.getAttribute("content"))
      .toBe("https://backdroply.com/studio");
  });

  it("updates robots when rerendered", () => {
    const { rerender } = render(
      <SeoHead
        lang="tr"
        path="/studio/history"
        title="Studio History"
        description="Private history"
        robots="noindex,nofollow,noarchive"
      />
    );

    expect(document.head.querySelector("meta[name='robots']")?.getAttribute("content"))
      .toBe("noindex,nofollow,noarchive");

    rerender(
      <SeoHead
        lang="tr"
        path="/"
        title="Ana Sayfa"
        description="Aciklama"
      />
    );

    expect(document.head.querySelector("meta[name='robots']")?.getAttribute("content"))
      .toBe("index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1");
  });
});
