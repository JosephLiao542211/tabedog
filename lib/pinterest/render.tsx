// Renders a pin's design to a 1000×1500 PNG with next/og (Satori). Photos go through sharp first:
// Satori only decodes PNG/JPEG, and a 1000px JPEG keeps the render fast whatever the source was.
import "server-only";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { SITE } from "../seo";
import { PIN_SIZE, type PinDesign } from "./design";

const W = PIN_SIZE.width, H = PIN_SIZE.height;
const INK = "#1a1c1a", PAPER = "#fdfffc", MUTED = "#5d625d";

type Font = { name: string; data: ArrayBuffer; weight: 600 | 800; style: "normal" };
let fonts: Promise<Font[]> | null = null;

/** Urbanist (the site's typeface) from Google Fonts, once per instance. Falls back to the built-in font. */
function loadFonts(): Promise<Font[]> {
  return (fonts ??= (async () => {
    const css = await (await fetch("https://fonts.googleapis.com/css2?family=Urbanist:wght@600;800")).text(); // no UA = TTF
    const faces = [...css.matchAll(/font-weight:\s*(\d+);[^}]*?url\((https:[^)]+\.ttf)\)/g)];
    return Promise.all(faces.map(async ([, w, url]) => ({ name: "Urbanist", data: await (await fetch(url)).arrayBuffer(), weight: Number(w) as 600 | 800, style: "normal" as const })));
  })().catch((e) => { console.warn("[pinterest] fonts", e); fonts = null; return []; }));
}

/** The photo as a JPEG data URL sized to the box it fills, or null if it can't be fetched or decoded. */
async function photoData(url: string | null, w: number, h: number) {
  if (!url) return null;
  try {
    const res = await fetch(url, { headers: { "user-agent": "TabeDogPins/1.0 (+https://tabedog.com)" }, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const jpg = await sharp(Buffer.from(await res.arrayBuffer())).rotate().resize(w, h, { fit: "cover", position: "attention" }).jpeg({ quality: 84 }).toBuffer();
    return `data:image/jpeg;base64,${jpg.toString("base64")}`;
  } catch (e) {
    console.warn("[pinterest] photo", url, e);
    return null;
  }
}

const headlineSize = (text: string, big: number) => (text.length > 70 ? big * 0.66 : text.length > 45 ? big * 0.8 : big);

function Brand({ color, dot = "#ff6347" }: { color: string; dot?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30, fontWeight: 800, color }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: dot }} />
      {SITE.url.replace(/^https?:\/\//, "")}
    </div>
  );
}

function Credit({ text, color }: { text: string; color: string }) {
  return text ? <div style={{ display: "flex", fontSize: 18, fontWeight: 600, color, maxWidth: 560, textAlign: "right" }}>{text}</div> : null;
}

function Kicker({ text, color }: { text: string; color: string }) {
  return text ? <div style={{ display: "flex", fontSize: 30, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase", color }}>{text}</div> : null;
}

function layout(d: PinDesign, photo: string | null) {
  const t = d.template === "type" || !photo ? "type" : d.template;
  const headline = <div style={{ display: "flex", fontSize: headlineSize(d.headline, t === "list" ? 76 : 96), fontWeight: 800, lineHeight: 1.02, letterSpacing: -2 }}>{d.headline}</div>;

  if (t === "overlay") {
    return (
      <div style={{ width: W, height: H, display: "flex", position: "relative", background: INK, color: PAPER }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo!} alt="" width={W} height={H} style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} />
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, display: "flex", backgroundImage: "linear-gradient(180deg, rgba(26,28,26,0) 30%, rgba(26,28,26,.6) 55%, rgba(26,28,26,.92) 80%)" }} />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 26, width: W, height: H, padding: 72 }}>
          {d.kicker && <div style={{ display: "flex" }}><div style={{ display: "flex", padding: "10px 20px", borderRadius: 999, background: d.accent, fontSize: 28, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>{d.kicker}</div></div>}
          {headline}
          {d.subhead && <div style={{ display: "flex", fontSize: 38, fontWeight: 600, lineHeight: 1.25, color: "rgba(253,255,252,.86)" }}>{d.subhead}</div>}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 18 }}>
            <Brand color={PAPER} />
            <Credit text={d.credit} color="rgba(253,255,252,.6)" />
          </div>
        </div>
      </div>
    );
  }

  if (t === "type") {
    return (
      <div style={{ width: W, height: H, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 84, background: d.accent, color: PAPER }}>
        <Brand color={PAPER} dot={PAPER} />
        <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
          <Kicker text={d.kicker} color="rgba(253,255,252,.8)" />
          <div style={{ display: "flex", fontSize: headlineSize(d.headline, 118), fontWeight: 800, lineHeight: 1, letterSpacing: -3 }}>{d.headline}</div>
          {d.subhead && <div style={{ display: "flex", fontSize: 42, fontWeight: 600, lineHeight: 1.25, color: "rgba(253,255,252,.88)" }}>{d.subhead}</div>}
          {d.items.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 10 }}>
              {d.items.slice(0, 5).map((item, i) => <div key={i} style={{ display: "flex", fontSize: 36, fontWeight: 600 }}>{`${i + 1}. ${item}`}</div>)}
            </div>
          )}
        </div>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 800 }}>Read the full guide →</div>
      </div>
    );
  }

  const photoH = t === "list" ? 640 : 860;
  return (
    <div style={{ width: W, height: H, display: "flex", flexDirection: "column", background: PAPER, color: INK }}>
      <div style={{ display: "flex", position: "relative", width: W, height: photoH }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo!} alt="" width={W} height={photoH} style={{ width: W, height: photoH }} />
        {d.credit && <div style={{ position: "absolute", right: 20, bottom: 16, display: "flex", padding: "4px 10px", borderRadius: 6, background: "rgba(26,28,26,.55)" }}><Credit text={d.credit} color="rgba(253,255,252,.85)" /></div>}
      </div>
      <div style={{ display: "flex", height: 14, background: d.accent }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "52px 72px 56px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Kicker text={d.kicker} color={d.accent} />
          {headline}
          {t === "photo-top" && d.subhead && <div style={{ display: "flex", fontSize: 36, fontWeight: 600, lineHeight: 1.25, color: MUTED }}>{d.subhead}</div>}
          {t === "list" && d.items.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
              {d.items.slice(0, 5).map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 36, fontWeight: 600 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: 26, background: d.accent, color: PAPER, fontSize: 28, fontWeight: 800 }}>{String(i + 1)}</div>
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>
        <Brand color={INK} />
      </div>
    </div>
  );
}

/** The pin as an ImageResponse (a PNG Response). */
export async function renderPin(d: PinDesign) {
  const photoH = d.template === "list" ? 640 : d.template === "overlay" ? H : 860;
  const [photo, f] = await Promise.all([d.template === "type" ? null : photoData(d.photo, W, photoH), loadFonts()]);
  const el = <div style={{ display: "flex", width: W, height: H, fontFamily: f.length ? "Urbanist" : "sans-serif" }}>{layout(d, photo)}</div>;
  return new ImageResponse(el, { ...PIN_SIZE, ...(f.length ? { fonts: f } : {}) });
}

/** The pin as a JPEG for upload: a tenth the size of the PNG, which matters in a base64 request body. */
export async function renderPinJpeg(d: PinDesign): Promise<Buffer> {
  const png = Buffer.from(await (await renderPin(d)).arrayBuffer());
  return sharp(png).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
}
