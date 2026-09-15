import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "FlatFolks — Find Rooms & Flatmates in India";

// Used as the default social-share image for any page that doesn't set its
// own openGraph.images (e.g. the homepage, /about) — the property detail
// page overrides this with the listing's own photo.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg,#0b1220 0%,#132657 55%,#1d3fae 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: 20,
              background: "linear-gradient(135deg,#2563eb,#4f46e5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 34,
              fontWeight: 800,
            }}
          >
            F
          </div>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: "white" }}>FlatFolks</div>
        </div>
        <div style={{ display: "flex", marginTop: 44, fontSize: 62, fontWeight: 800, lineHeight: 1.15, color: "white", maxWidth: 980 }}>
          Find Rooms &amp; Flatmates Across India
        </div>
        <div style={{ display: "flex", marginTop: 26, fontSize: 27, color: "#c7d2fe" }}>
          Verified listings · No brokerage · Direct contact with owners
        </div>
      </div>
    ),
    { ...size },
  );
}
