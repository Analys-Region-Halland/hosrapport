// Serverrenderingstester för Prosa, Begrepp och BegreppSida: rätt markup,
// roller och att första förekomsten gäller över flera Prosa med delat omfång.
// Interaktionen (popover, ark, fokus) prövas i webbläsaren, se slutrapporten för WP5.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Ark from "../ui/Ark";
import Popover from "../ui/Popover";
import Begrepp from "./Begrepp";
import BegreppSida from "./BegreppSida";
import Prosa from "./Prosa";
import { alfabetisk, BEGREPP } from "./register";

const knappar = (html: string) => [...html.matchAll(/<button[^>]*data-begrepp="([^"]+)"[^>]*>([^<]*)<\/button>/g)].map((m) => [m[1], m[2]]);

describe("Prosa", () => {
  it("gör ett stycke per textblock och länkar begrepp som knappar", () => {
    const html = renderToStaticMarkup(<Prosa text={"Halland ligger över rikssnittet.\n\nMedianen steg."} />);
    expect(html.match(/<p>/g)).toHaveLength(2);
    expect(knappar(html)).toEqual([["rikssnitt", "rikssnittet"], ["median", "Medianen"]]);
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-haspopup="dialog"');
  });

  it("länkar bara första förekomsten över flera Prosa med samma redan", () => {
    const redan = new Set<string>();
    const html = renderToStaticMarkup(
      <>
        <Prosa text="Regionen ligger över rikssnittet och i topp 3." redan={redan} />
        <Prosa text="Rikssnittet påverkas inte. Halland ligger i topp 3 igen. Medianen syns." redan={redan} />
      </>,
    );
    expect(knappar(html)).toEqual([["rikssnitt", "rikssnittet"], ["topp-3", "topp 3"], ["median", "Medianen"]]);
  });

  it("tar bort explicit markering och länkar den", () => {
    const html = renderToStaticMarkup(<Prosa text="Ett [[seriebrott|brott i serien]] och [[okand|ett ord]]." />);
    expect(knappar(html)).toEqual([["seriebrott", "brott i serien"]]);
    expect(html).not.toContain("[[");
    expect(html).toContain("ett ord");
  });

  it("håller ett skiljetecken direkt efter markeringen ihop med den", () => {
    const html = renderToStaticMarkup(<Prosa text="Halland ligger över rikssnittet. Medianen steg" />);
    expect(html).toMatch(/<span class="[^"]*">\s*<button[^>]*data-begrepp="rikssnitt"[^>]*>rikssnittet<\/button>\.<\/span> /);
    expect(html).toMatch(/<button[^>]*data-begrepp="median"[^>]*>Medianen<\/button> steg/);
    expect(knappar(html)).toEqual([["rikssnitt", "rikssnittet"], ["median", "Medianen"]]);
  });

  it("länkar inget i text utan begrepp", () => {
    expect(renderToStaticMarkup(<Prosa text="Halland ligger stabilt." />)).not.toContain("<button");
  });
});

describe("Begrepp", () => {
  it("visar bara texten när id saknas i registret", () => {
    expect(renderToStaticMarkup(<Begrepp id="finns-inte">ord</Begrepp>)).toBe("ord");
  });

  it("renderar ingen popover eller ark när de är stängda", () => {
    expect(renderToStaticMarkup(<Popover oppen={false} onStang={() => {}} ankare={null}>x</Popover>)).toBe("");
    expect(renderToStaticMarkup(<Ark oppen={false} onStang={() => {}} etikett="x">x</Ark>)).toBe("");
  });
});

describe("BegreppSida", () => {
  const html = renderToStaticMarkup(<BegreppSida />);

  it("har sidrubrik och en post per begrepp i alfabetisk ordning", () => {
    expect(html).toMatch(/<h1[^>]*>Begrepp<\/h1>/);
    const ordning = [...html.matchAll(/data-begrepp-post="([^"]+)"/g)].map((m) => m[1]);
    expect(ordning).toEqual(alfabetisk(BEGREPP).map((b) => b.id));
  });

  it("ger varje begrepp ett ankare och en rubrik", () => {
    for (const b of BEGREPP) {
      expect(html).toContain(`id="begrepp-${b.id}"`);
      expect(html).toContain(`id="begrepp-${b.id}-term"`);
    }
    expect(html.match(/<h2/g)).toHaveLength(BEGREPP.length);
  });

  it("visar källa och se även som länkar", () => {
    expect(html).toContain('href="https://extra.skr.se/vantetiderivarden/omvantetider/omvardgaranti.43558.html"');
    expect(html).toContain("Källa:");
    expect(html).toContain('href="#/begrepp/tillganglighetsgaranti"');
    expect(html).toContain("Se även:");
  });
});
