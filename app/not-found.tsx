import Link from "next/link";
import { Footer, Header } from "@/components/Chrome";
import { OrbitMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="wrap">
        <div className="empty">
          <div className="empty-orbit"><span /><span /><span /><OrbitMark size={64} /></div>
          <h2>404 — Jashtë orbitës.</h2>
          <p className="muted">Kjo faqe nuk ekziston ose është zhvendosur.</p>
          <Link className="btn" href="/">Kthehu në ballinë →</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
