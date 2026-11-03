
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./StorePages.css";

type Product = {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  price: number | string;
  currency: string;
  cover_image_url: string | null;
  status: string;
  is_featured: boolean;
  includes: unknown;
  format: string | null;
};

type Category = {
  id: string;
  name: string;
  slug: string;
};

function formatPrice(price: number | string, currency: string) {
  const amount = Number(price);

  if (!Number.isFinite(amount)) {
    return `${currency} ${price}`;
  }

  try {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: currency || "ZAR",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency || "ZAR"} ${amount.toFixed(2)}`;
  }
}

function getIncludes(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === "string",
    );
  }

  return [];
}

function getProductStyle(categorySlug: string, format: string | null) {
  const text = `${categorySlug} ${format ?? ""}`.toLowerCase();

  if (
    text.includes("social") ||
    text.includes("creative") ||
    text.includes("template")
  ) {
    return "product-social";
  }

  if (
    text.includes("business") ||
    text.includes("workbook") ||
    text.includes("guide")
  ) {
    return "product-business";
  }

  return "product-planner";
}

export default function ProductPage() {
  const { slug } = useParams();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      setLoading(true);
      setLoadError("");
      setProduct(null);
      setCategory(null);

      if (!slug) {
        setLoading(false);
        return;
      }

      const { data: productData, error: productError } = await supabase
        .from("products")
        .select(
          "id, category_id, name, slug, short_description, description, price, currency, cover_image_url, status, is_featured, includes, format",
        )
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

      if (!active) return;

      if (productError) {
        console.error("Product loading error:", productError);
        setLoadError("We couldn't load this product. Please try again.");
        setLoading(false);
        return;
      }

      if (!productData) {
        setLoading(false);
        return;
      }

      const loadedProduct = productData as Product;
      setProduct(loadedProduct);

      if (loadedProduct.category_id) {
        const { data: categoryData, error: categoryError } = await supabase
          .from("categories")
          .select("id, name, slug")
          .eq("id", loadedProduct.category_id)
          .eq("is_active", true)
          .maybeSingle();

        if (!active) return;

        if (categoryError) {
          console.error("Product category loading error:", categoryError);
        }

        setCategory((categoryData as Category | null) ?? null);
      }

      setLoading(false);
    }

    void loadProduct();

    return () => {
      active = false;
    };
  }, [slug]);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  const includes = getIncludes(product?.includes);
  const productStyle = getProductStyle(category?.slug ?? "", product?.format ?? null);

  if (loading || loadError || !product) {
    return (
      <div className="store-page">
        <header className="store-header">
          <Link
            className="store-wordmark"
            to="/"
            onClick={closeMobileMenu}
          >
            clearfern studio
            <span>DIGITAL GOODS, THOUGHTFULLY MADE</span>
          </Link>

          <button
            className={`store-menu-toggle${mobileMenuOpen ? " is-open" : ""}`}
            type="button"
            aria-label={
              mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
            }
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
          {loading ? (
            <>
              <p className="store-eyebrow">JUST A MOMENT</p>
              <h1>Finding your <em>product.</em></h1>
              <p>We're loading the product details.</p>
            </>
          ) : loadError ? (
            <>
              <p className="store-eyebrow">A LITTLE DETOUR</p>
              <h1>Something went <em>wrong.</em></h1>
              <p>{loadError}</p>
            </>
          ) : (
            <>
              <p className="store-eyebrow">A LITTLE DETOUR</p>
              <h1>We couldn't find <em>that product.</em></h1>
              <p>
                It may have moved, or it may no longer be available.
              </p>
            </>
          )}

          <Link className="store-button" to="/shop">
            Return to the shop
          </Link>
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
        <Link
          className="store-wordmark"
          to="/"
          onClick={closeMobileMenu}
        >
          clearfern studio
          <span>DIGITAL GOODS, THOUGHTFULLY MADE</span>
        </Link>

        <button
          className={`store-menu-toggle${mobileMenuOpen ? " is-open" : ""}`}
          type="button"
          aria-label={
            mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
          }
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
          <div className={`product-detail-art ${productStyle}`}>
            {product.cover_image_url ? (
              <img
                className="store-product-cover"
                src={product.cover_image_url}
                alt={product.name}
              />
            ) : (
              <>
                <span className="store-product-label">
                  {category?.name ?? "Digital product"}
                </span>

                {productStyle === "product-planner" && (
                  <div className="mini-planner detail-planner">
                    <span className="mini-planner-title">
                      {product.name}
                    </span>
                    <span className="mini-planner-subtitle">A FRESH PAGE</span>
                    <div className="mini-days">
                      {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                        <span key={`${day}-${i}`}>{day}</span>
                      ))}
                    </div>
                    <div className="mini-lines">
                      <i />
                      <i />
                      <i />
                      <i />
                    </div>
                  </div>
                )}

                {productStyle === "product-social" && (
                  <div className="mini-social detail-social">
                    <span>YOUR BRAND,</span>
                    <strong>your story.</strong>
                    <span className="social-decoration">✳</span>
                  </div>
                )}

                {productStyle === "product-business" && (
                  <div className="mini-workbook detail-workbook">
                    <span>THE SMALL</span>
                    <strong>
                      business
                      <br />
                      toolkit.
                    </strong>
                    <span className="workbook-rule" />
                    <span>IDEAS INTO ACTION</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="product-detail-copy">
            <p className="store-eyebrow">
              {category?.name ?? "Digital product"}
            </p>
            <h1>{product.name}</h1>

            <p className="product-detail-tagline">
              {product.short_description ||
                "A thoughtfully made digital product."}
            </p>

            {product.description && (
              <p className="product-detail-description">
                {product.description}
              </p>
            )}

            <div className="product-detail-price">
              {formatPrice(product.price, product.currency)}
            </div>

            <button className="store-button" type="button" disabled>
              Purchase options coming soon
            </button>

            <p className="product-detail-note">
              This product is listed in our collection. Online checkout and
              automatic digital delivery are not yet connected to this page.
            </p>

            <div className="product-detail-facts">
              {includes.length > 0 && (
                <>
                  <h2>What's included</h2>
                  <ul>
                    {includes.map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </>
              )}

              {product.format && (
                <>
                  <h2>Format</h2>
                  <p>{product.format}</p>
                </>
              )}
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
