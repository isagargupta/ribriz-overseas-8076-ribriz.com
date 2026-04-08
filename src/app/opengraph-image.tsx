import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#3525cd",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top: Brand name */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              width: "52px",
              height: "52px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                color: "#3525cd",
                fontSize: "22px",
                fontWeight: 800,
                letterSpacing: "-1px",
              }}
            >
              R
            </div>
          </div>
          <div
            style={{
              color: "white",
              fontSize: "28px",
              fontWeight: 700,
              letterSpacing: "3px",
            }}
          >
            RIBRIZ
          </div>
        </div>

        {/* Middle: Main headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              color: "white",
              fontSize: "68px",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-2px",
            }}
          >
            Study Abroad,
            <br />
            Powered by AI.
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.75)",
              fontSize: "26px",
              fontWeight: 400,
              lineHeight: 1.5,
            }}
          >
            Match universities · Predict admission · Generate SOPs
          </div>
        </div>

        {/* Bottom: Social proof */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "32px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <div style={{ color: "white", fontSize: "32px", fontWeight: 700 }}>
              12,000+
            </div>
            <div
              style={{ color: "rgba(255,255,255,0.6)", fontSize: "16px" }}
            >
              Students
            </div>
          </div>
          <div
            style={{
              width: "1px",
              height: "40px",
              background: "rgba(255,255,255,0.2)",
            }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <div style={{ color: "white", fontSize: "32px", fontWeight: 700 }}>
              300+
            </div>
            <div
              style={{ color: "rgba(255,255,255,0.6)", fontSize: "16px" }}
            >
              Universities
            </div>
          </div>
          <div
            style={{
              width: "1px",
              height: "40px",
              background: "rgba(255,255,255,0.2)",
            }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <div style={{ color: "white", fontSize: "32px", fontWeight: 700 }}>
              15+
            </div>
            <div
              style={{ color: "rgba(255,255,255,0.6)", fontSize: "16px" }}
            >
              Countries
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div
            style={{
              background: "rgba(255,255,255,0.15)",
              borderRadius: "100px",
              padding: "12px 24px",
              color: "white",
              fontSize: "18px",
              fontWeight: 500,
            }}
          >
            ribriz.com
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
