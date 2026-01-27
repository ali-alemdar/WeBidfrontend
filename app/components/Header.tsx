import Link from "next/link";

export default function Header() {
  return (
    <header
      style={{
        height: "60px",
        borderBottom: "1px solid var(--color-border)",
        background: "white",
        display: "flex",
        alignItems: "center",
        padding: "0 2rem",
        justifyContent: "space-between",
      }}
    >
      <strong>E-Bidding</strong>

      <nav style={{ display: "flex", gap: "1rem" }}>
        <Link href="/">Home</Link>
        <Link href="/bidder">Bidder</Link>
        <Link href="/employee">Employee</Link>
      </nav>
    </header>
  );
}
