import { fireEvent, render, screen } from "@testing-library/react";
import { useI18n, LanguageProvider } from "../i18n";

function Probe() {
  const { lang, setLang, t } = useI18n();
  return (
    <div>
      <div data-testid="lang">{lang}</div>
      <div data-testid="title">{t.heroTitleEmphasis}</div>
      <button type="button" onClick={() => setLang("en")}>
        to-en
      </button>
      <button type="button" onClick={() => setLang("tr")}>
        to-tr
      </button>
    </div>
  );
}

describe("LanguageProvider", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("reads persisted language and keeps dictionary aligned", () => {
    localStorage.setItem("backdroply_lang", "en");
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    );

    expect(screen.getByTestId("lang")).toHaveTextContent("en");
    expect(screen.getByTestId("title")).toHaveTextContent("instantly");

    fireEvent.click(screen.getByText("to-tr"));
    expect(screen.getByTestId("lang")).toHaveTextContent("tr");
    expect(localStorage.getItem("backdroply_lang")).toBe("tr");
  });
});
