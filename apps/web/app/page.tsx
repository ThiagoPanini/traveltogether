import { getApiHealth } from "@/lib/api/health";

export default async function Home() {
  const health = await getApiHealth();

  return (
    <main
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100dvh",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "1.5rem",
          color: "var(--accent-text)",
          margin: 0,
        }}
      >
        traveltogether
      </h1>
      <p style={{ color: "var(--text-muted)", margin: 0, fontFamily: "var(--font-mono)" }}>
        api{" "}
        <span style={{ color: health.status === "ok" ? "var(--success)" : "var(--danger)" }}>
          {health.status}
        </span>
        {" · "}db{" "}
        <span style={{ color: health.db === "ok" ? "var(--success)" : "var(--danger)" }}>
          {health.db}
        </span>
      </p>
    </main>
  );
}
