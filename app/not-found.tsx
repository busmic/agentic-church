import Link from "next/link";
export default function NotFound() {
  return (
    <div className="page" style={{ textAlign: "center", paddingTop: 80 }}>
      <h1>Nothing here</h1>
      <p className="muted">This road leads nowhere.</p>
      <Link href="/" className="btn-yellow" style={{ display: "inline-block", marginTop: 12 }}>Back to town</Link>
    </div>
  );
}
