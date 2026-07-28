import Link from "next/link";
import { getUser } from "./auth";
import { BrandMark } from "./components/BrandMark";

export const dynamic = "force-dynamic";

const features = [
  {
    number: "01",
    title: "Professional invoices",
    copy: "Create clear, branded invoices with taxes, discounts, payment terms, and downloadable client copies.",
  },
  {
    number: "02",
    title: "Client records",
    copy: "Keep contact and billing details together, so every new invoice starts with accurate information.",
  },
  {
    number: "03",
    title: "Receivables overview",
    copy: "See outstanding, overdue, and paid revenue from one calm business dashboard.",
  },
];

export default async function Home() {
  const user = await getUser();
  const primaryHref = user ? "/dashboard" : "#features";

  return (
    <main className="marketing-page">
      <header className="marketing-nav">
        <Link href="/" className="brand-link" aria-label="Invoicy home">
          <BrandMark />
          <span className="brand-copy">
            <strong>Invoicy</strong>
            <small>invoicy.ca</small>
          </span>
        </Link>
        <nav aria-label="Primary navigation">
          <a href="#features">Features</a>
          <a href="#security">Security</a>
          <Link href={primaryHref} className="button button-secondary">
            {user ? "Open dashboard" : "Explore platform"}
          </Link>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Professional invoicing for independent work</p>
          <h1>
            Run your business with <em>confidence.</em>
          </h1>
          <p className="hero-lede">
            Create invoices, organize clients, and follow every dollar your
            business is owed from one focused workspace.
          </p>
          <div className="hero-actions">
            <Link href={primaryHref} className="button button-primary">
              {user ? "Go to dashboard" : "Explore Invoicy"}
            </Link>
            <a href="#features" className="text-link">
              Explore the platform
            </a>
          </div>
          <div className="trust-row">
            <span>Secure accounts</span>
            <span>Canadian currencies</span>
            <span>Built for self-employed work</span>
          </div>
        </div>

        <div
          className="hero-product"
          aria-label="Illustrative Invoicy dashboard with demonstration data"
        >
          <div className="product-window">
            <div className="product-window-top">
              <BrandMark compact />
              <span>Overview</span>
              <span className="status-pill">All systems ready</span>
            </div>
            <div className="product-greeting">
              <div>
                <small>Demonstration account</small>
                <h2>Your business overview</h2>
              </div>
              <span className="button button-primary">New invoice</span>
            </div>
            <div className="metric-grid">
              <article>
                <span>Outstanding</span>
                <strong>$2,400</strong>
                <small>1 sample invoice</small>
              </article>
              <article>
                <span>Overdue</span>
                <strong>$0</strong>
                <small>Nothing overdue</small>
              </article>
              <article>
                <span>Paid this month</span>
                <strong>$0</strong>
                <small>No sample payments</small>
              </article>
            </div>
            <div className="invoice-card">
              <div>
                <span className="invoice-avatar">NP</span>
                <p>
                  <strong>Sample client</strong>
                  <small>INV-DEMO-001</small>
                </p>
              </div>
              <span>Due Aug 12</span>
              <strong>$2,400.00</strong>
              <span className="status-pill status-pill-blue">Sent</span>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-section" id="features">
        <div className="section-heading">
          <p className="eyebrow">Everything in one place</p>
          <h2>A serious platform for the business you are building.</h2>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <article key={feature.number}>
              <span>{feature.number}</span>
              <h3>{feature.title}</h3>
              <p>{feature.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="security-section" id="security">
        <div>
          <p className="eyebrow">Business data, handled properly</p>
          <h2>Your invoices should not disappear with a browser reset.</h2>
        </div>
        <p>
          Invoicy stores account, client, and invoice records in protected
          server-side storage. Every record is checked against the signed-in
          account before it is read or changed.
        </p>
      </section>

      <footer className="marketing-footer">
        <BrandMark />
        <p>
          Professional invoices.
          <br />
          <em>Made simple.</em>
        </p>
        <small>invoicy.ca | Built for independent businesses</small>
      </footer>
    </main>
  );
}
