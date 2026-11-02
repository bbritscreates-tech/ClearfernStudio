import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { products } from "../data/products";
import "./StorePages.css";

export default function ProductPage() {
  const { slug } = useParams();
  const product = products.find((item) => item.slug === slug);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  if (!product) {
    return (
      <div className="store-page">
        <header className="store-header">
          <Link className="store-wordmark" to="/" onClick={closeMobileMenu}>
            clearfern studio
            <span>DIGITAL GOODS, THOUGHTFULLY MADE</span>
          </Link>

          <button
            className={`store-menu-toggle${mobileMenuOpen ? " is-open" : ""}`}
            type="button"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-controls="store-main-navigation"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>

          <nav
            className={`store-nav${mobileMenuOpen ? " is-open" : ""}`}
            id="store-main-navigation"
            aria-label="Main navigation"
          >
            <Link to="/" onClick={closeMobileMenu}>Home</Link>
            <Link to="/shop" onClick={closeMobileMenu}>Shop all</Link>
          </nav>
        </header>
        <main className="store-main not-found">
          <p className="store-eyebrow">A LITTLE DETOUR</p>
          <h1>We couldn't find <em>that product.</em></h1>
          <p>It may have moved, or the address may be incorrect.</p>
          <Link className="store-button" to="/shop">Return to the shop</Link>
        </main>
        <footer className="store-footer">
          <span>© {new Date().getFullYear()} Clearfern Studio</span>
          <Link to="/">Back to home ↑</Link>
        </footer>
      </div>
    );
  }

  return (
    <div className="store-page">
      <header className="store-header">
        <Link className="store-wordmark" to="/" onClick={closeMobileMenu}>
          clearfern studio
          <span>DIGITAL GOODS, THOUGHTFULLY MADE</span>
        </Link>

        <button
          className={`store-menu-toggle${mobileMenuOpen ? " is-open" : ""}`}
          type="button"
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-controls="store-main-navigation"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav
          className={`store-nav${mobileMenuOpen ? " is-open" : ""}`}
          id="store-main-navigation"
          aria-label="Main navigation"
        >
          <Link to="/" onClick={closeMobileMenu}>Home</Link>
          <Link to="/shop" onClick={closeMobileMenu}>Shop all</Link>
        </nav>
      </header>

      <main className="store-main product-detail">
        <div className="store-breadcrumb">
          <Link to="/shop">Shop all</Link>
          <span>/</span>
          <span>{product.name}</span>
        </div>

        <div className="product-detail-layout">
          <div className={`product-detail-art ${product.style}`}>
            <span className="store-product-label">{product.label}</span>

            {product.style === "product-planner" && (
              <div className="mini-planner detail-planner">
                <span className="mini-planner-title">the weekly reset</span>
                <span className="mini-planner-subtitle">A FRESH PAGE</span>
                <div className="mini-days">
                  {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                    <span key={`${day}-${i}`}>{day}</span>
                  ))}
                </div>
                <div className="mini-lines"><i /><i /><i /><i /></div>
              </div>
            )}

            {product.style === "product-social" && (
              <div className="mini-social detail-social">
                <span>YOUR BRAND,</span>
                <strong>your story.</strong>
                <span className="social-decoration">✳</span>
              </div>
            )}

            {product.style === "product-business" && (
              <div className="mini-workbook detail-workbook">
                <span>THE SMALL</span>
                <strong>business<br />toolkit.</strong>
                <span className="workbook-rule" />
                <span>IDEAS INTO ACTION</span>
              </div>
            )}

            <span className="store-preview-tag">Preview only</span>
          </div>

          <div className="product-detail-copy">
            <p className="store-eyebrow">{product.category}</p>
            <h1>{product.name}</h1>
            <p className="product-detail-tagline">{product.description}</p>
            <p className="product-detail-description">{product.longDescription}</p>

            <div className="product-detail-price">{product.price}</div>
            <button className="store-button" type="button" disabled>
              Coming soon
            </button>
            <p className="product-detail-note">
              This preview is not available to purchase yet.
            </p>

            <div className="product-detail-facts">
              <h2>What's included</h2>
              <ul>
                {product.includes.map((item) => <li key={item}>{item}</li>)}
              </ul>

              <h2>Format</h2>
              <p>{product.format}</p>

              <h2>Made for</h2>
              <p>{product.suitableFor}</p>
            </div>
          </div>
        </div>

        <div className="product-detail-back">
          <Link to="/shop">← Back to all products</Link>
        </div>
      </main>

      <footer className="store-footer">
        <span>© {new Date().getFullYear()} Clearfern Studio</span>
        <Link to="/">Back to home ↑</Link>
      </footer>
    </div>
  );
}
