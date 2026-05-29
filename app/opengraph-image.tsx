import { ImageResponse } from "next/og";

// Next picks this up automatically and serves it at /opengraph-image
// with the right <meta property="og:image"> tags. 1200×630 is the OG spec.
// We render a mock dashboard "screenshot" — sidebar, line switcher in the
// top bar, the KPI strip, and a sample voyage card — so the social
// preview tells you exactly what the product is in one glance.
export const runtime = "edge";
export const alt = "Tripket PH — operations dashboard for Philippine ferries";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Mock data — frozen so the preview reads consistently across deploys.
const ACTIVE_LINE = { name: "2GO Travel", initial: "2G", tint: "#ec4899" };
const KPIS = [
  { label: "Total Revenue",    value: "₱4.82M", trend: "+22%", up: true  },
  { label: "Tickets Issued",   value: "1,340",  trend: "+18%", up: true  },
  { label: "Cancellations",    value: "28",     trend: "-8%",  up: false },
  { label: "Vehicle Bookings", value: "184",    trend: "+14%", up: true  },
];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#f8fafc",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          color: "#0f172a",
        }}
      >
        {/* ─── Sidebar ─── */}
        <div
          style={{
            width: "72px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: "24px",
            paddingBottom: "24px",
            backgroundColor: "#ffffff",
            borderRight: "1px solid #e2e8f0",
            gap: "16px",
          }}
        >
          {/* App tile */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              backgroundColor: "#f97316",
              boxShadow: "0 8px 20px -8px rgba(249,115,22,0.6)",
              color: "white",
              fontSize: "20px",
              fontWeight: 800,
            }}
          >
            T
          </div>
          {/* Nav dots — abstracted into pills since we don't need to caption them */}
          {[true, false, false, false, false, false].map((active, i) => (
            <div
              key={i}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                backgroundColor: active ? "#fff7ed" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "4px",
                  backgroundColor: active ? "#f97316" : "#cbd5e1",
                }}
              />
            </div>
          ))}
        </div>

        {/* ─── Main column ─── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Top bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "20px 32px",
              borderBottom: "1px solid #e2e8f0",
              backgroundColor: "#ffffff",
            }}
          >
            {/* Shipping line switcher */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "8px 14px 8px 8px",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                backgroundColor: "#ffffff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  backgroundColor: ACTIVE_LINE.tint,
                  color: "white",
                  fontSize: "13px",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                }}
              >
                {ACTIVE_LINE.initial}
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "-0.01em", color: "#0f172a" }}>
                  {ACTIVE_LINE.name}
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Shipping line · Business
                </div>
              </div>
              <div style={{ marginLeft: "8px", color: "#94a3b8", fontSize: "14px" }}>▾</div>
            </div>

            {/* Right side — date filter + user */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 14px",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#ffffff",
                  fontSize: "13px",
                  color: "#475569",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                }}
              >
                <span style={{ color: "#f97316" }}>📅</span>
                <span>Apr 30 – May 29, 2026</span>
              </div>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "999px",
                  backgroundColor: "#fef3c7",
                  color: "#b45309",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: 700,
                }}
              >
                AD
              </div>
            </div>
          </div>

          {/* Page content */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding: "28px 32px",
              gap: "20px",
            }}
          >
            {/* Page header */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ fontSize: "26px", fontWeight: 700, letterSpacing: "-0.02em" }}>
                Dashboard
              </div>
              <div style={{ fontSize: "13px", color: "#64748b" }}>
                {ACTIVE_LINE.name} · Operations overview
              </div>
            </div>

            {/* KPI strip */}
            <div
              style={{
                display: "flex",
                borderRadius: "16px",
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                overflow: "hidden",
                boxShadow: "0 20px 40px -24px rgba(15,23,42,0.08)",
              }}
            >
              {KPIS.map((k, i) => (
                <div
                  key={k.label}
                  style={{
                    flex: 1,
                    padding: "20px 22px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    borderRight: i < KPIS.length - 1 ? "1px solid #f1f5f9" : "none",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "#94a3b8",
                    }}
                  >
                    {k.label}
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.02em", color: "#0f172a" }}>
                    {k.value}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: k.up ? "#059669" : "#dc2626",
                    }}
                  >
                    <span>{k.up ? "▲" : "▼"}</span>
                    <span>{k.trend}</span>
                    <span style={{ color: "#94a3b8", fontWeight: 500 }}>vs last week</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Voyage card — mirrors the shared VoyageCard look. */}
            <div
              style={{
                marginTop: "8px",
                padding: "8px",
                borderRadius: "16px",
                backgroundImage:
                  "radial-gradient(140% 80% at 100% 0%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 55%), linear-gradient(180deg, #fed7aa 0%, #fdba74 60%, #fb923c 100%)",
                boxShadow: "0 16px 36px -12px rgba(234,88,12,0.45)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Status band */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "6px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "#c2410c",
                  }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "999px",
                      backgroundColor: "#ea580c",
                    }}
                  />
                  In Transit
                </div>
              </div>

              {/* White inner panel — vessel header + itinerary */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: "#ffffff",
                  borderRadius: "12px",
                  padding: "14px 18px 16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      backgroundColor: ACTIVE_LINE.tint,
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      fontWeight: 800,
                    }}
                  >
                    {ACTIVE_LINE.initial}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "-0.01em" }}>
                        MV Filipinas Cebu
                      </span>
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: "6px",
                          fontSize: "10px",
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          backgroundColor: "#ecfdf5",
                          color: "#047857",
                          border: "1px solid #a7f3d0",
                        }}
                      >
                        RoRo
                      </span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{ACTIVE_LINE.name}</div>
                  </div>
                </div>

                {/* Itinerary row */}
                <div
                  style={{
                    marginTop: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "24px",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                      8:00 AM
                    </div>
                    <div style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "0.02em", color: "#0f172a", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                      CEB
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Cebu City</div>
                  </div>

                  {/* Route bar */}
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <div style={{ width: "100%", height: "4px", borderRadius: "999px", backgroundColor: "#ffedd5", display: "flex" }}>
                      <div style={{ width: "60%", borderRadius: "999px", backgroundColor: "#f97316" }} />
                    </div>
                    <div
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "#64748b",
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                      }}
                    >
                      3H 30M
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    <div style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                      11:30 AM
                    </div>
                    <div style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "0.02em", color: "#0f172a", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                      DGT
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>Dumaguete City</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
