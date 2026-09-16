import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg,#2563eb,#7c3aed)",
        }}
      >
        <svg width="104" height="104" viewBox="0 0 24 24" fill="none">
          <path d="M4 11 L12 4 L20 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="9.5" cy="16" r="3.2" fill="white" fillOpacity="0.95" />
          <circle cx="14.5" cy="16" r="3.2" fill="white" fillOpacity="0.65" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
