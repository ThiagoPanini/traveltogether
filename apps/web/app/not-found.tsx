export default function NotFound() {
  return (
    <main
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100dvh",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      <p style={{ fontFamily: "var(--font-mono)", color: "var(--text-faint)", margin: 0 }}>
        404 — página não encontrada
      </p>
    </main>
  );
}
