import Link from "next/link";

export function Landing() {
  return (
    <main style={{ minHeight: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
      <img src="/logo.svg" alt="" width={56} height={56} />
      <h1 className="h1" style={{ fontSize: 40 }}>TabeDog</h1>
      <p className="p1" style={{ color: "var(--muted)", maxWidth: 420 }}>A personal map front end for Tabelog. Coming soon.</p>
      <Link href="/login" className="chip on" style={{ textDecoration: "none" }}>Sign in</Link>
    </main>
  );
}
