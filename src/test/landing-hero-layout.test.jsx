import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import LandingPage from "../pages/LandingPage";
import { LanguageProvider } from "../i18n";

vi.mock("@react-oauth/google", () => ({
  GoogleLogin: () => <button type="button">mock-google</button>
}));

function renderLanding(lang) {
  localStorage.setItem("backdroply_lang", lang);
  localStorage.setItem("backdroply_guide_seen", "1");
  render(
    <LanguageProvider>
      <MemoryRouter>
        <LandingPage user={null} googleEnabled={false} onGoogleSuccess={async () => {}} />
      </MemoryRouter>
    </LanguageProvider>
  );
  return screen.getByRole("heading", { level: 1 });
}

describe("Landing hero typography parity", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("keeps the same class-based sizing in TR and EN", () => {
    const trHeading = renderLanding("tr");
    const trClass = trHeading.className;

    cleanup();
    localStorage.clear();

    const enHeading = renderLanding("en");
    const enClass = enHeading.className;

    expect(trClass).toContain("min-h-[2.85em]");
    expect(trClass).toContain("md:min-h-[2.8em]");
    expect(enClass).toContain("min-h-[2.85em]");
    expect(enClass).toContain("md:min-h-[2.8em]");
    expect(trClass).toBe(enClass);
  });
});
