import Link from "next/link";
import { Footer, Header } from "@/components/Chrome";

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="wrap">
        <div className="empty">
          <h2>Faqja nuk u gjet</h2>
          <p>Ky artikull nuk ekziston ose është zhvendosur.</p>
          <Link className="btn" href="/">Kthehu në ballinë</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
