import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { skapaRouter, LASPOSITION_FORDROJNING, type Plats } from "./useRoute";

// En låtsad webbläsarhistorik: en lista med poster och ett index, som
// history.pushState/replaceState/back/forward.
function skapaPlats(start = "") {
  const poster = [start];
  let index = 0;
  let lyssnare: (() => void) | null = null;
  const logg: string[] = [];
  const plats: Plats = {
    hash: () => poster[index],
    push(h) {
      poster.splice(index + 1);
      poster.push(h);
      index++;
      logg.push(`push ${h}`);
    },
    ersatt(h) {
      poster[index] = h;
      logg.push(`ersatt ${h}`);
    },
    lyssna(f) {
      lyssnare = f;
    },
  };
  return {
    plats,
    logg,
    poster,
    get index() { return index; },
    /** Bakåt eller framåt: webbläsaren byter post och skickar popstate + hashchange. */
    ga(steg: number) {
      index += steg;
      lyssnare?.();
      lyssnare?.();
    },
    /** En vanlig länk eller handskriven adress: ny post, sedan händelserna. */
    lank(h: string) {
      poster.splice(index + 1);
      poster.push(h);
      index++;
      lyssnare?.();
      lyssnare?.();
    },
  };
}

const KAP = "#/kapitel/skr-tillganglighet?vy=ar";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("router", () => {
  it("läser adressen vid start och skriver den kanoniskt när någon prenumererar", () => {
    const b = skapaPlats("#/kapitel/skr-tillganglighet");
    const r = skapaRouter(b.plats);
    expect(r.tillstand()).toMatchObject({ route: { sida: "kapitel", id: "skr-tillganglighet", vy: "ar" }, kalla: "start", rulla: true });
    expect(b.logg).toEqual([]);
    r.prenumerera(() => {});
    expect(b.logg).toEqual([`ersatt ${KAP}`]);
    expect(b.poster).toEqual([KAP]);
  });

  it("säger om adressen saknade vy, så att appen kan välja kapitlets vy (WP9)", () => {
    const b = skapaPlats("#/kapitel/akutflode?i=vantetid");
    const r = skapaRouter(b.plats);
    r.prenumerera(() => {});
    expect(r.tillstand()).toMatchObject({ route: { id: "akutflode", vy: "ar", i: "vantetid" }, utanVy: true });
    // Appen byter vy med navigera; då är vyn bestämd
    r.navigera({ sida: "kapitel", id: "akutflode", vy: "manad", i: "vantetid" }, { ersatt: true });
    expect(r.tillstand().utanVy).toBe(false);
    expect(b.poster).toEqual(["#/kapitel/akutflode?vy=manad&i=vantetid"]);
    // En adress med vy, och historiken tillbaka till en utan
    b.lank("#/kapitel/akutflode?vy=dag");
    expect(r.tillstand().utanVy).toBe(false);
    b.lank("#/kapitel/akutflode");
    expect(r.tillstand().utanVy).toBe(true);
    // Gammalt ankare utanför ett kapitel har ingen vy
    const c = skapaPlats("#rapport-akutflode");
    const r2 = skapaRouter(c.plats);
    r2.registreraAnkarUppslag((x) => (x === "akutflode" ? "akutflode" : undefined));
    expect(r2.tillstand()).toMatchObject({ route: { sida: "kapitel", id: "akutflode" }, utanVy: true });
  });

  it("tom adress blir #/ och ogiltig adress blir startsidan", () => {
    const b = skapaPlats("");
    skapaRouter(b.plats).prenumerera(() => {});
    expect(b.poster).toEqual(["#/"]);
    const c = skapaPlats("#/finns-inte");
    const r = skapaRouter(c.plats);
    r.prenumerera(() => {});
    expect(r.tillstand().route).toEqual({ sida: "start" });
    expect(c.poster).toEqual(["#/"]);
  });

  it("sidbyten lägger till historikposter; bakåt och framåt landar rätt", () => {
    const b = skapaPlats("#/");
    const r = skapaRouter(b.plats);
    const andringar: string[] = [];
    r.prenumerera(() => andringar.push(r.tillstand().kalla));
    r.navigera({ sida: "kapitel", id: "skr-tillganglighet", vy: "ar" });
    r.navigera({ sida: "kapitel", id: "skr-tillganglighet", vy: "ar", i: "kolada-n79223" });
    expect(b.poster).toEqual(["#/", KAP, `${KAP}&i=kolada-n79223`]);
    expect(r.tillstand()).toMatchObject({ kalla: "navigering", rulla: true, fokus: true });

    b.ga(-1);
    expect(r.tillstand()).toMatchObject({ route: { sida: "kapitel", id: "skr-tillganglighet" }, kalla: "historik", rulla: true, fokus: false });
    expect((r.tillstand().route as { i?: string }).i).toBeUndefined();
    b.ga(-1);
    expect(r.tillstand().route).toEqual({ sida: "start" });
    b.ga(2);
    expect(r.tillstand().route).toMatchObject({ i: "kolada-n79223" });
    // popstate och hashchange för samma byte ger bara en ändring
    expect(andringar).toEqual(["navigering", "navigering", "historik", "historik", "historik"]);
  });

  it("samma adress igen ger ingen ny post men ett nytt nr, så att ramen rullar igen", () => {
    const b = skapaPlats(KAP);
    const r = skapaRouter(b.plats);
    r.prenumerera(() => {});
    const nr = r.tillstand().nr;
    r.navigera({ sida: "kapitel", id: "skr-tillganglighet", vy: "ar" });
    expect(b.poster).toEqual([KAP]);
    expect(r.tillstand().nr).toBe(nr + 1);
  });

  it("ersatt byter posten i stället för att lägga till; boolesk andra parameter betyder ersatt", () => {
    const b = skapaPlats(KAP);
    const r = skapaRouter(b.plats);
    r.prenumerera(() => {});
    r.navigera({ sida: "kapitel", id: "skr-tillganglighet", vy: "ar", red: true }, { ersatt: true, rulla: false });
    expect(b.poster).toEqual([`${KAP}&red=1`]);
    expect(r.tillstand()).toMatchObject({ rulla: false, fokus: false });
    r.navigera({ sida: "las" }, true);
    expect(b.poster).toEqual(["#/las"]);
  });

  it("läspositionen skrivs med fördröjd replaceState: ingen historikflod", () => {
    const b = skapaPlats(KAP);
    const r = skapaRouter(b.plats);
    r.prenumerera(() => {});
    b.logg.length = 0;
    const block = ["tillg-primarvard", "kolada-n79179", "kolada-n79173", "tillg-specialiserad", "kolada-n79221"];
    for (let n = 0; n < 100; n++) {
      r.uppdateraLasposition(block[n % block.length]);
      vi.advanceTimersByTime(50);
    }
    expect(b.logg).toEqual([]);
    vi.advanceTimersByTime(LASPOSITION_FORDROJNING);
    expect(b.logg).toEqual([`ersatt ${KAP}&i=kolada-n79221`]);
    expect(b.poster).toHaveLength(1);
    expect(r.tillstand()).toMatchObject({ route: { i: "kolada-n79221" }, rulla: false });
  });

  it("samma position som adressen redan har skriver inget", () => {
    const b = skapaPlats(`${KAP}&i=x`);
    const r = skapaRouter(b.plats);
    r.prenumerera(() => {});
    b.logg.length = 0;
    r.uppdateraLasposition("y");
    r.uppdateraLasposition("x");
    vi.advanceTimersByTime(LASPOSITION_FORDROJNING * 2);
    expect(b.logg).toEqual([]);
  });

  it("överst i kapitlet tas i bort; v och e följer inte med till ett nytt block, red gör det", () => {
    const b = skapaPlats(`${KAP}&i=x&v=rang&e=0001&red=1`);
    const r = skapaRouter(b.plats);
    r.prenumerera(() => {});
    r.uppdateraLasposition("y");
    vi.advanceTimersByTime(LASPOSITION_FORDROJNING);
    expect(b.poster).toEqual([`${KAP}&i=y&red=1`]);
    r.uppdateraLasposition(undefined);
    vi.advanceTimersByTime(LASPOSITION_FORDROJNING);
    expect(b.poster).toEqual([`${KAP}&red=1`]);
  });

  it("en väntande läsposition skrivs in i den gamla posten innan ett sidbyte", () => {
    const b = skapaPlats(KAP);
    const r = skapaRouter(b.plats);
    r.prenumerera(() => {});
    r.uppdateraLasposition("kolada-n79224");
    r.navigera({ sida: "kapitel", id: "akutflode", vy: "manad" });
    expect(b.poster).toEqual([`${KAP}&i=kolada-n79224`, "#/kapitel/akutflode?vy=manad"]);
    vi.advanceTimersByTime(LASPOSITION_FORDROJNING * 2);
    expect(b.poster).toHaveLength(2);
    b.ga(-1);
    expect(r.tillstand().route).toMatchObject({ id: "skr-tillganglighet", i: "kolada-n79224" });
  });

  it("bakåt släpper en väntande läsposition i stället för att skriva den i fel post", () => {
    const b = skapaPlats("#/");
    const r = skapaRouter(b.plats);
    r.prenumerera(() => {});
    r.navigera({ sida: "kapitel", id: "skr-tillganglighet", vy: "ar" });
    r.uppdateraLasposition("x");
    b.ga(-1);
    vi.advanceTimersByTime(LASPOSITION_FORDROJNING * 2);
    expect(b.poster).toEqual(["#/", KAP]);
  });

  it("läspositionen gäller bara kapitel", () => {
    const b = skapaPlats("#/sammanfattning?vy=ar");
    const r = skapaRouter(b.plats);
    r.prenumerera(() => {});
    r.uppdateraLasposition("x");
    vi.advanceTimersByTime(LASPOSITION_FORDROJNING * 2);
    expect(b.poster).toEqual(["#/sammanfattning?vy=ar"]);
  });

  it("vanlig länk och handskriven adress tolkas och skrivs kanoniskt i samma post", () => {
    const b = skapaPlats("#/");
    const r = skapaRouter(b.plats);
    r.prenumerera(() => {});
    b.lank("#/kapitel/akutflode?red=1&vy=vecka");
    expect(b.poster).toEqual(["#/", "#/kapitel/akutflode?vy=vecka&red=1"]);
    expect(r.tillstand()).toMatchObject({ kalla: "historik", rulla: true });
    b.lank("#/kapitel/");
    expect(b.poster[2]).toBe("#/");
  });
});

describe("gamla ankare i routern", () => {
  const uppslag = (id: string) => ({ "kolada-n79179": "skr-tillganglighet", akutflode: "akutflode" } as Record<string, string>)[id];

  it("inne i ett kapitel skrivs ankaret om direkt till samma kapitel", () => {
    const b = skapaPlats("#/kapitel/akutflode?vy=manad");
    const r = skapaRouter(b.plats);
    r.prenumerera(() => {});
    b.lank("#rapport-vantetid");
    expect(b.poster).toEqual(["#/kapitel/akutflode?vy=manad", "#/kapitel/akutflode?vy=manad&i=vantetid"]);
    expect(r.tillstand()).toMatchObject({ ankare: null, rulla: true });
  });

  it("vid start utan uppslag blir ankaret väntande; uppslaget löser det med replaceState", () => {
    const b = skapaPlats("#rapport-kolada-n79179");
    const r = skapaRouter(b.plats);
    r.prenumerera(() => {});
    expect(r.tillstand()).toMatchObject({ route: { sida: "start" }, ankare: "kolada-n79179" });
    expect(b.poster).toEqual(["#rapport-kolada-n79179"]);
    r.registreraAnkarUppslag(uppslag);
    expect(b.poster).toEqual(["#/kapitel/skr-tillganglighet?vy=ar&i=kolada-n79179"]);
    expect(r.tillstand()).toMatchObject({ ankare: null, rulla: true, fokus: false });
  });

  it("med registrerat uppslag skrivs ankaret om direkt", () => {
    const b = skapaPlats("#/");
    const r = skapaRouter(b.plats);
    r.prenumerera(() => {});
    r.registreraAnkarUppslag(uppslag);
    b.lank("#rapport-akutflode");
    expect(b.poster).toEqual(["#/", "#/kapitel/akutflode?vy=ar"]);
  });

  it("ett väntande ankare som appen inte hittar ersätts med startsidan", () => {
    const b = skapaPlats("#rapport-okand");
    const r = skapaRouter(b.plats);
    r.prenumerera(() => {});
    r.registreraAnkarUppslag(uppslag);
    expect(r.tillstand().ankare).toBe("okand");
    r.navigera({ sida: "start" }, { ersatt: true });
    expect(b.poster).toEqual(["#/"]);
    expect(r.tillstand().ankare).toBeNull();
  });
});
