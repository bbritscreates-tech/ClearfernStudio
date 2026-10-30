
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import "./App.css";
import StorePages from "./StorePages";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_zar: number;
  status: "draft" | "active" | "archived";
  cover_image_path: string | null;
};

type CartItem = {
  productId: string;
  quantity: number;
};

function readHomeCartCount(): number {
  try {
    const saved = localStorage.getItem("clearfern-cart");
    const cart: unknown = saved ? JSON.parse(saved) : [];

    if (!Array.isArray(cart)) return 0;

    return cart.reduce((total: number, item: CartItem) => {
      if (
        item &&
        typeof item.productId === "string" &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0
      ) {
        return total + item.quantity;
      }

      return total;
    }, 0);
  } catch {
    return 0;
  }
}

function ShoppingBagIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="23"
      height="23"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 8h14l1 13H4L5 8Z" />
      <path d="M9 9V6a3 3 0 0 1 6 0v3" />
    </svg>
  );
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(price);
}

function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("All products");
  const [menuOpen, setMenuOpen] = useState(false);
  const [homeCartCount, setHomeCartCount] = useState(readHomeCartCount);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      setLoading(true);
      setError("");

      const { data, error: queryError } = await supabase
        .from("products")
        .select(
          "id, name, slug, description, price_zar, status, cover_image_path",
        )
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (queryError) {
        setError("We couldn't load the products. Please try again later.");
      } else {
        setProducts((data ?? []) as Product[]);
      }

      setLoading(false);
    }

    void loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const updateCartCount = () => {
      setHomeCartCount(readHomeCartCount());
    };

    window.addEventListener("pageshow", updateCartCount);
    window.addEventListener("storage", updateCartCount);

    return () => {
      window.removeEventListener("pageshow", updateCartCount);
      window.removeEventListener("storage", updateCartCount);
    };
  }, []);

  const closeMenu = () => setMenuOpen(false);

  const visibleProducts =
    category === "All products"
      ? products
      : products.filter((product) =>
          product.name.toLowerCase().includes(category.toLowerCase()),
        );

  return (
    <div className="site-shell">
      <header className="site-header">
        <a
          className="brand"
          href="#home"
          aria-label="Clearfern Studio home"
          onClick={closeMenu}
        >
          <span className="brand-mark">C</span>
          <span className="brand-copy">
            <strong>Clearfern Studio</strong>
            <small>Thoughtful digital goods</small>
          </span>
        </a>

        <button
          className="mobile-menu-toggle"
          type="button"
          aria-label={
            menuOpen ? "Close navigation menu" : "Open navigation menu"
          }
          aria-expanded={menuOpen}
          aria-controls="main-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span
            className={
              menuOpen
                ? "hamburger-line line-one open"
                : "hamburger-line line-one"
            }
          />
          <span
            className={
              menuOpen
                ? "hamburger-line line-two open"
                : "hamburger-line line-two"
            }
          />
          <span
            className={
              menuOpen
                ? "hamburger-line line-three open"
                : "hamburger-line line-three"
            }
          />
        </button>

        <nav
          id="main-navigation"
          className={`site-nav${menuOpen ? " is-open" : ""}`}
          aria-label="Main navigation"
        >
          <a href="/shop" onClick={closeMenu}>
            Shop
          </a>
          <a href="#about" onClick={closeMenu}>
            Our approach
          </a>
          <a href="#contact" onClick={closeMenu}>
            Contact
          </a>
        </nav>

        <div className="header-actions">
          <a
            href="/cart"
            className="home-cart-icon"
            aria-label={`Shopping cart, ${homeCartCount} ${
              homeCartCount === 1 ? "item" : "items"
            }`}
            onClick={closeMenu}
          >
            <ShoppingBagIcon />
            {homeCartCount > 0 && (
              <span className="home-cart-badge" aria-hidden="true">
                {homeCartCount > 99 ? "99+" : homeCartCount}
              </span>
            )}
          </a>

          <a className="header-link" href="/shop" onClick={closeMenu}>
            Explore the shop <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-copy">
            <span className="eyebrow">DIGITAL GOODS, MADE WITH PURPOSE</span>
            <h1>
              Make space for
              <br />
              <span>what matters.</span>
            </h1>
            <p>
              Thoughtfully designed digital resources to help you organise
              your days, nurture your ideas and make progress at your own pace.
            </p>
            <a className="primary-button" href="#shop">
              Explore the collection <span aria-hidden="true">→</span>
            </a>
            <div className="hero-note">
              <span className="note-dot" />
              Digital products, ready for your everyday
            </div>
          </div>

          <div className="hero-art" aria-label="A calm, minimal illustration">
            <div className="art-sun" />
            <div className="art-card art-card-back">
              <span className="art-line short" />
              <span className="art-line" />
              <span className="art-line medium" />
              <span className="art-check">✓</span>
              <span className="art-line" />
            </div>
            <div className="art-card art-card-front">
              <span className="art-label">A LITTLE SPACE TO GROW</span>
              <div className="art-leaf">✳</div>
              <h2>Plan gently.</h2>
              <h2>Grow steadily.</h2>
              <span className="art-rule" />
              <span className="art-caption">Your pace. Your progress.</span>
            </div>
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
          </div>
        </section>

        <section className="promise-strip">
          <div>
            <span>01</span> Made for real life
          </div>
          <div>
            <span>02</span> Simple to use
          </div>
          <div>
            <span>03</span> Designed with care
          </div>
        </section>

        <section className="shop-section" id="shop">
          <div className="section-heading">
            <div>
              <span className="eyebrow">THE COLLECTION</span>
              <h2>Find your next favourite.</h2>
              <p>
                Explore practical digital resources designed to make life feel
                a little clearer.
              </p>
            </div>
            <span className="product-count">
              {products.length} {products.length === 1 ? "product" : "products"}
            </span>
          </div>

          <div className="category-list" aria-label="Filter products">
            {["All products", "Planner", "Template", "Workbook"].map((item) => (
              <button
                className={category === item ? "category active" : "category"}
                key={item}
                onClick={() => setCategory(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="shop-message" role="status">
              Loading the collection…
            </div>
          ) : error ? (
            <div className="shop-message error-message" role="alert">
              {error}
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="empty-collection">
              <div className="empty-icon">✳</div>
              <h3>A little something is growing.</h3>
              <p>
                Our digital collection is being prepared. Please check back
                soon to discover what’s new.
              </p>
            </div>
          ) : (
            <div className="product-grid">
              {visibleProducts.map((product) => (
                <article className="product-card" key={product.id}>
                  <div className="product-art">
                    {product.cover_image_path ? (
                      <img
                        src={product.cover_image_path}
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      <div className="product-placeholder">
                        <span className="product-placeholder-mark">C.</span>
                        <span>Clearfern Studio</span>
                      </div>
                    )}
                    <span className="digital-label">DIGITAL PRODUCT</span>
                  </div>
                  <div className="product-details">
                    <h3>{product.name}</h3>
                    <p>
                      {product.description ||
                        "A thoughtfully made digital resource."}
                    </p>
                    <div className="product-footer">
                      <strong>{formatPrice(Number(product.price_zar))}</strong>
                      <a
                        className="coming-soon-label"
                        href={`/product/${encodeURIComponent(product.slug)}`}
                      >
                        View details
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <p className="shop-footnote">
            Prices are currently shown in South African rand (ZAR). Checkout
            and international currency display will be configured in a later step.
          </p>
        </section>

        <section className="about-section" id="about">
          <div className="about-symbol">✳</div>
          <div>
            <span className="eyebrow">A MORE THOUGHTFUL WAY</span>
            <h2>
              Useful things.
              <br />
              Room to grow.
            </h2>
            <p>
              Clearfern Studio is built around a simple idea: the right tools
              can help everyday life feel more manageable. Our aim is to create
              practical digital resources that are clear, considered and easy
              to make your own.
            </p>
          </div>
        </section>

        <section className="contact-section" id="contact">
          <span className="eyebrow">STAY IN TOUCH</span>
          <h2>Good things take shape.</h2>
          <p>Have a question or an idea? We’d love to hear from you.</p>
          <a
            className="secondary-button"
            href="mailto:hello@clearfernstudio.com"
          >
            Contact the studio
          </a>
          <small>
            Update this contact address when your business email is ready.
          </small>
        </section>
      </main>

      <footer className="site-footer">
        <a className="footer-brand" href="#home">
          Clearfern Studio
        </a>
        <span>Thoughtfully made. Ready for your everyday.</span>
        <span>© {new Date().getFullYear()} Clearfern Studio</span>
      </footer>
    </div>
  );
}

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";

  if (
    path === "/shop" ||
    path === "/cart" ||
    path.startsWith("/product/")
  ) {
    return <StorePages />;
  }

  return <HomePage />;
}
