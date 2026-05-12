import { ImageResponse } from "next/og"

export const runtime = "edge"

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0d1728 0%, #0b3d38 100%)",
          padding: "72px 80px",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              background: "rgba(15,118,110,0.35)",
              border: "1px solid rgba(15,118,110,0.6)",
              borderRadius: "8px",
              padding: "6px 14px",
              color: "#9ee1d4",
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "0.07em",
              textTransform: "uppercase"
            }}
          >
            EU
          </div>
          <span
            style={{
              color: "rgba(238,247,245,0.55)",
              fontSize: "15px",
              fontWeight: 700,
              letterSpacing: "0.07em",
              textTransform: "uppercase"
            }}
          >
            AUTOTIME · BORDERLESS APPLY
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div
            style={{
              fontSize: "68px",
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.06,
              letterSpacing: "-0.025em"
            }}
          >
            Your EU job search,
            <br />
            <span style={{ color: "#2dd4bf" }}>without the guesswork.</span>
          </div>
          <div
            style={{
              fontSize: "22px",
              color: "rgba(238,247,245,0.65)",
              lineHeight: 1.55,
              maxWidth: "760px",
              fontWeight: 400
            }}
          >
            Transparent gap scoring, risk flags, and next actions — built for
            cross-border EU tech candidates. No auto-submit.
          </div>
        </div>

        <div style={{ display: "flex", gap: "16px" }}>
          {(
            [
              ["EU cross-border", "Country fit, visa risk, market context"],
              ["No auto-submit", "You review every application"],
              ["Transparent scoring", "Gaps, risks, next actions clearly"]
            ] as [string, string][]
          ).map(([label, sub]) => (
            <div
              key={label}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "5px",
                padding: "16px 20px",
                background: "rgba(255,255,255,0.07)",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.12)",
                flex: 1
              }}
            >
              <span style={{ color: "#ffffff", fontSize: "16px", fontWeight: 700 }}>
                {label}
              </span>
              <span
                style={{
                  color: "rgba(238,247,245,0.55)",
                  fontSize: "14px",
                  fontWeight: 400
                }}
              >
                {sub}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
