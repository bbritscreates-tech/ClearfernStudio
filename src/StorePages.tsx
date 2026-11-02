
import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabase";
import "./StorePages.css";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_zar: number;
  status: "draft" | "active" | "archived";
  cover_image_path: string | null;
  category_id?: string | null;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

type CartItem = {
  productId: string;
  quantity: number;
};

const CART_KEY = "clearfern-cart";
const MAX_QUANTITY = 99;

function readCart(): CartItem[] {
  try {
    const saved = localStorage.getItem(CART_KEY);
    const parsed: unknown = saved ? JSON.parse(saved) : [];

    if (!Array.isArray(parsed)) return [];

    const validItems: CartItem[] = [];

    for (const item of parsed) {
      if (
        !item ||
        typeof item.productId !== "string" ||
        !item.productId.trim() ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1
      ) {
        continue;
      }

      const quantity = Math.min(item.quantity, MAX_QUANTITY);
      const existing = validItems.find(
        (entry) => entry.productId === item.productId,
      );

      if (existing) {
        existing.quantity = Math.min(
          existing.quantity + quantity,
          MAX_QUANTITY,
        );
      } else {
        validItems.push({ productId: item.productId, quantity });
      }
    }

    return validItems;
  } catch {
    return [];
  }
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(price);
}

/**
 * Converts a Supabase Storage object path into a public image URL.
 * Existing absolute URLs are returned unchanged.
 */
function getProductImageUrl(path: string | null): string | null {
  if (!path?.trim()) return null;

  const trimmedPath = path.trim();

  if (/^https?:\/\//i.test(trimmedPath)) {
    return trimmedPath;
  }

  const cleanPath = trimmedPath.replace(/^\/+/, "");

  const objectPath = cleanPath.startsWith("product-media/")
    ? cleanPath.slice("product-media/".length)
    : cleanPath;

  const { data } = supabase.storage
    .from("product-media")
    .getPublicUrl(objectPath);

  return data.publicUrl || null;
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

export default function StorePages() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const isCartPage = path === "/cart";
  const isProductPage = path.startsWith("/product/");
  const productSlug = isProductPage
    ? decodeURIComponent(path.slice("/product/".length))
    : "";

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>(readCart);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [cartMessage, setCartMessage] = useState("");
  const [confirmClearCart, setConfirmClearCart] = useState(false);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    let active = true;

    async function loadStore() {
      setLoading(true);
      setError("");

      try {
        const [productResult, categoryResult] = await Promise.all([
          supabase
            .from("products")
            .select(
              "id, name, slug, description, price_zar, status, cover_image_path, category_id",
            )
            .eq("status", "active")
            .order("created_at", { ascending: false }),

          supabase
            .from("categories")
            .select("id, name, slug, is_active")
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
        ]);

        if (!active) return;

        if (productResult.error) {
          setError("We couldn't load the shop. Please try again later.");
        } else {
          setProducts((productResult.data ?? []) as Product[]);
        }

        if (!categoryResult.error) {
          setCategories((categoryResult.data ?? []) as Category[]);
        }
      } catch {
        if (active) {
          setError("Something went wrong loading the shop. Please try again.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadStore();

    return () => {
      active = false;
    };
  }, []);

  const selectedProduct = products.find(
    (product) => product.slug === productSlug,
  );

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    const result = products.filter((product) => {
      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        (product.description ?? "").toLowerCase().includes(term);

      const matchesCategory =
        selectedCategory === "all" ||
        product.category_id === selectedCategory;

      return matchesSearch && matchesCategory;
    });

    return [...result].sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return Number(a.price_zar) - Number(b.price_zar);

        case "price-high":
          return Number(b.price_zar) - Number(a.price_zar);

        case "name":
          return a.name.localeCompare(b.name);

        default:
          return products.indexOf(a) - products.indexOf(b);
      }
    });
  }, [products, search, selectedCategory, sortBy]);

  function addToCart(productId: string) {
    setCart((current) => {
      const existing = current.find(
        (item) => item.productId === productId,
      );

      if (existing) {
        return current.map((item) =>
          item.productId === productId
            ? {
                ...item,
                quantity: Math.min(item.quantity + 1, MAX_QUANTITY),
              }
            : item,
        );
      }

      return [...current, { productId, quantity: 1 }];
    });

    setCartMessage("Product added to your cart.");
  }

  function updateQuantity(productId: string, quantity: number) {
    setCart((current) => {
      if (quantity < 1) {
        return current.filter((item) => item.productId !== productId);
      }

      return current.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: Math.min(Math.floor(quantity), MAX_QUANTITY),
            }
          : item,
      );
    });

    setCartMessage("");
  }

  function removeFromCart(productId: string) {
    setCart((current) =>
      current.filter((item) => item.productId !== productId),
    );

    setCartMessage("Product removed from your cart.");
    setConfirmClearCart(false);
  }

  function clearCart() {
    setCart([]);
    setCartMessage("Your cart has been cleared.");
    setConfirmClearCart(false);
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const cartProducts = cart
    .map((item) => ({
      item,
      product: products.find((product) => product.id === item.productId),
    }))
    .filter(
      (
        entry,
      ): entry is { item: CartItem; product: Product } =>
        Boolean(entry.product),
    );

  const cartTotal = cartProducts.reduce(
    (sum, entry) =>
      sum + Number(entry.product.price_zar) * entry.item.quantity,
    0,
  );

  const pageTitle = isCartPage
    ? "Your shopping cart"
    : isProductPage
      ? "Product details"
      : "The collection";

  return (
    <div className="store-page">
      <header className="store-header">
        <a
          className="store-brand"
          href="/"
          aria-label="Clearfern Studio home"
        >
          <span className="store-brand-images">
            <img
              className="store-brand-logo"
              src="/clearfern-logo.png"
              alt=""
              aria-hidden="true"
            />
            </span>
            <span>
            <img
              className="store-brand-wordmark"
              src="/clearfern-wordmark.png"
              alt="Clearfern Studio"
            />
          </span>
        </a>

        <nav className="store-nav" aria-label="Shop navigation">
          <a href="/">Home</a>
          <a href="/shop">Shop</a>
          

          <a
            href="/cart"
            className="cart-icon-link"
            aria-label={`Shopping cart, ${cartCount} ${
              cartCount === 1 ? "item" : "items"
            }`}
            aria-current={isCartPage ? "page" : undefined}
          >
            <ShoppingBagIcon />

            {cartCount > 0 && (
              <span className="cart-icon-badge" aria-hidden="true">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </a>
        </nav>
      </header>

      <main className="store-main">
        <section className="store-heading">
          <h1>{pageTitle}</h1>
          <p>
            Thoughtfully designed digital resources for your everyday life.
          </p>
        </section>

        {cartMessage && (
          <p className="store-notice" role="status">
            {cartMessage}
          </p>
        )}

        {loading ? (
          <p className="store-notice" role="status">
            Loading products…
          </p>
        ) : error ? (
          <div className="store-empty" role="alert">
            <h2>We couldn't load the shop</h2>
            <p>{error}</p>
            <button
              className="store-button"
              type="button"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        ) : isCartPage ? (
          <section className="cart-layout">
            {cartProducts.length === 0 ? (
              <div className="store-empty">
                <span className="store-eyebrow">YOUR CART</span>
                <h2>Your cart is waiting for something lovely.</h2>
                <p>
                  Your cart is currently empty. Explore the collection and find
                  something useful for your everyday life.
                </p>
                <a className="store-button" href="/shop">
                  Explore the shop
                </a>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  <div className="cart-list-heading">
                    <h2>
                      Your items <span>({cartCount})</span>
                    </h2>

                    {!confirmClearCart ? (
                      <button
                        className="store-text-button clear-cart-button"
                        type="button"
                        onClick={() => setConfirmClearCart(true)}
                      >
                        Clear cart
                      </button>
                    ) : (
                      <div
                        className="clear-cart-confirm"
                        role="group"
                        aria-label="Confirm clearing cart"
                      >
                        <span>Remove all items?</span>
                        <button
                          className="store-text-button"
                          type="button"
                          onClick={clearCart}
                        >
                          Yes, clear
                        </button>
                        <button
                          className="store-text-button"
                          type="button"
                          onClick={() => setConfirmClearCart(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {cartProducts.map(({ item, product }) => {
                    const imageUrl = getProductImageUrl(
                      product.cover_image_path,
                    );

                    return (
                      <article className="cart-item" key={product.id}>
                        <a
                          className="cart-image"
                          href={`/product/${encodeURIComponent(product.slug)}`}
                          aria-label={`View ${product.name}`}
                        >
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={product.name}
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <span>C.</span>
                          )}
                        </a>

                        <div className="cart-item-info">
                          <a
                            href={`/product/${encodeURIComponent(product.slug)}`}
                          >
                            <h2>{product.name}</h2>
                          </a>

                          <p className="cart-item-price">
                            {formatPrice(Number(product.price_zar))} each
                          </p>

                          <div className="cart-quantity-control">
                            <span>Quantity</span>

                            <div
                              className="quantity-stepper"
                              role="group"
                              aria-label={`Quantity for ${product.name}`}
                            >
                              <button
                                type="button"
                                aria-label={`Decrease quantity of ${product.name}`}
                                disabled={item.quantity <= 1}
                                onClick={() =>
                                  updateQuantity(
                                    product.id,
                                    item.quantity - 1,
                                  )
                                }
                              >
                                −
                              </button>

                              <output aria-live="polite">
                                {item.quantity}
                              </output>

                              <button
                                type="button"
                                aria-label={`Increase quantity of ${product.name}`}
                                disabled={item.quantity >= MAX_QUANTITY}
                                onClick={() =>
                                  updateQuantity(
                                    product.id,
                                    item.quantity + 1,
                                  )
                                }
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <button
                            className="store-text-button cart-remove-button"
                            type="button"
                            onClick={() => removeFromCart(product.id)}
                          >
                            Remove
                          </button>
                        </div>

                        <strong className="cart-line-total">
                          {formatPrice(
                            Number(product.price_zar) * item.quantity,
                          )}
                        </strong>
                      </article>
                    );
                  })}

                  <a className="store-continue-link" href="/shop">
                    ← Continue shopping
                  </a>
                </div>

                <aside className="cart-summary">
                  <h2>Order summary</h2>

                  <div>
                    <span>Items</span>
                    <strong>{cartCount}</strong>
                  </div>

                  <div>
                    <span>Subtotal</span>
                    <strong>{formatPrice(cartTotal)}</strong>
                  </div>

                  <p>
                    Digital products only. Your final order and payment will
                    be confirmed during checkout.
                  </p>

                  <button
                    className="store-button"
                    type="button"
                    disabled
                    title="Checkout is not available yet"
                  >
                    Checkout coming soon
                  </button>

                  <small className="cart-checkout-note">
                    Checkout is being prepared. You won't be charged at this
                    stage.
                  </small>
                </aside>
              </>
            )}
          </section>
        ) : isProductPage ? (
          !selectedProduct ? (
            <div className="store-empty">
              <h2>We couldn't find that product.</h2>
              <p>
                It may no longer be available, or the link may be incorrect.
              </p>
              <a className="store-button" href="/shop">
                Browse the shop
              </a>
            </div>
          ) : (
            <section className="product-detail">
              <div className="product-detail-image">
                {getProductImageUrl(selectedProduct.cover_image_path) ? (
                  <img
                    src={
                      getProductImageUrl(selectedProduct.cover_image_path) ??
                      undefined
                    }
                    alt={selectedProduct.name}
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <span className="product-detail-placeholder">C.</span>
                )}
              </div>

              <div className="product-detail-info">
                <span className="store-eyebrow">DIGITAL PRODUCT</span>
                <h2>{selectedProduct.name}</h2>

                <strong className="product-detail-price">
                  {formatPrice(Number(selectedProduct.price_zar))}
                </strong>

                <p>
                  {selectedProduct.description ||
                    "A thoughtfully made digital resource from Clearfern Studio."}
                </p>

                <p className="digital-delivery-note">
                  This is a digital product. Download and delivery options will
                  be provided during checkout once the purchasing system is
                  ready.
                </p>

                <button
                  className="store-button"
                  type="button"
                  onClick={() => addToCart(selectedProduct.id)}
                >
                  Add to cart
                </button>

                <a className="store-continue-link" href="/cart">
                  View cart ({cartCount})
                </a>

                <a className="store-continue-link" href="/shop">
                  Back to the shop
                </a>
              </div>
            </section>
          )
        ) : (
          <>
            <section
              className="shop-controls"
              aria-label="Search and filter products"
            >
              <label className="shop-search">
                <span>Search products</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name or description…"
                />
              </label>

              <label>
                <span>Category</span>
                <select
                  value={selectedCategory}
                  onChange={(event) =>
                    setSelectedCategory(event.target.value)
                  }
                >
                  <option value="all">All categories</option>
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Sort by</span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                >
                  <option value="newest">Newest</option>
                  <option value="name">Name: A–Z</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                </select>
              </label>
            </section>

            <p className="store-results-count">
              {filteredProducts.length}{" "}
              {filteredProducts.length === 1 ? "product" : "products"} found
            </p>

            {filteredProducts.length === 0 ? (
              <div className="store-empty">
                <h2>No products found</h2>
                <p>
                  Try another search or select a different category.
                </p>

                <button
                  className="store-button"
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedCategory("all");
                    setSortBy("newest");
                  }}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <section className="store-product-grid">
                {filteredProducts.map((product) => {
                  const imageUrl = getProductImageUrl(
                    product.cover_image_path,
                  );

                  return (
                    <article className="store-product-card" key={product.id}>
                      <a
                        className="store-product-image"
                        href={`/product/${encodeURIComponent(product.slug)}`}
                      >
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={product.name}
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <span className="store-product-placeholder">C.</span>
                        )}

                        <span className="store-digital-label">
                          DIGITAL PRODUCT
                        </span>
                      </a>

                      <div className="store-product-info">
                        <a
                          href={`/product/${encodeURIComponent(product.slug)}`}
                        >
                          <h2>{product.name}</h2>
                        </a>

                        <p>
                          {product.description ||
                            "A thoughtfully made digital resource."}
                        </p>

                        <div className="store-product-footer">
                          <strong>
                            {formatPrice(Number(product.price_zar))}
                          </strong>

                          <a
                            href={`/product/${encodeURIComponent(product.slug)}`}
                          >
                            View details →
                          </a>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>
            )}
          </>
        )}
      </main>

      <footer className="store-footer">
        <a href="/" className="store-footer-brand">
          Clearfern Studio
        </a>
        <span>Thoughtfully made. Ready for your everyday.</span>
        <a href="/shop">Continue exploring</a>
      </footer>
    </div>
  );
}
