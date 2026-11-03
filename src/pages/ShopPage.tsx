
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./StorePages.css";

type Category = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
};

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
  format: string | null;
};

type ShopProduct = Product & {
  categoryName: string;
  categorySlug: string;
};

type SortOption = "featured" | "name-asc" | "name-desc";

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

function getProductStyle(categorySlug: string, format: string | null) {
  const text = `${categorySlug} ${format ?? ""}`.toLowerCase();

  if (text.includes("social") || text.includes("creative") || text.includes("template")) {
    return "product-social";
  }

  if (text.includes("business") || text.includes("workbook") || text.includes("guide")) {
    return "product-business";
  }

  return "product-planner";
}

export default function ShopPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [sortOption, setSortOption] = useState<SortOption>("featured");

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadShop() {
      setLoading(true);
      setLoadError("");

      const [categoryResult, productResult] = await Promise.all([
        supabase
          .from("categories")
          .select("id, name, slug, is_active, sort_order")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),

        supabase
          .from("products")
          .select(
            "id, category_id, name, slug, short_description, description, price, currency, cover_image_url, status, is_featured, format",
          )
          .eq("status", "published"),
      ]);

      if (!active) return;

      if (categoryResult.error || productResult.error) {
        console.error("Shop loading error:", {
          categories: categoryResult.error,
          products: productResult.error,
        });

        setLoadError(
          "We couldn't load the shop right now. Please refresh the page and try again.",
        );
        setCategories([]);
        setProducts([]);
        setLoading(false);
        return;
      }

      const activeCategories = (categoryResult.data ?? []) as Category[];
      const categoryMap = new Map(
        activeCategories.map((category) => [category.id, category]),
      );

      const visibleProducts: ShopProduct[] = (
        (productResult.data ?? []) as Product[]
      )
        .filter((product) => {
          // Products without a category can still be displayed.
          // Products assigned to an inactive or missing category are hidden.
          return (
            !product.category_id ||
            categoryMap.has(product.category_id)
          );
        })
        .map((product) => {
          const category = product.category_id
            ? categoryMap.get(product.category_id)
            : undefined;

          return {
            ...product,
            categoryName: category?.name ?? "Digital product",
            categorySlug: category?.slug ?? "planning",
          };
        });

      setCategories(activeCategories);
      setProducts(visibleProducts);
      setLoading(false);
    }

    void loadShop();

    return () => {
      active = false;
    };
  }, []);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();

    const matchingProducts = products.filter((product) => {
      const matchesCategory =
        selectedCategory === "ALL" ||
        product.category_id === selectedCategory;

      const searchableText = [
        product.name,
        product.short_description,
        product.description,
        product.categoryName,
        product.categorySlug,
        product.slug,
        product.format,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();

      return matchesCategory && (!query || searchableText.includes(query));
    });

    if (sortOption === "name-asc") {
      return [...matchingProducts].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {
          sensitivity: "base",
        }),
      );
    }

    if (sortOption === "name-desc") {
      return [...matchingProducts].sort((a, b) =>
        b.name.localeCompare(a.name, undefined, {
          sensitivity: "base",
        }),
      );
    }

    return [...matchingProducts].sort(
      (a, b) => Number(b.is_featured) - Number(a.is_featured),
    );
  }, [products, searchQuery, selectedCategory, sortOption]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedCategory !== "ALL" ||
    sortOption !== "featured";

  function clearFilters() {
    setSearchQuery("");
    setSelectedCategory("ALL");
    setSortOption("featured");
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
          <Link to="/" onClick={closeMobileMenu}>
            Home
          </Link>
          <Link
            to="/shop"
            aria-current="page"
            onClick={closeMobileMenu}
          >
            Shop all
          </Link>
        </nav>
      </header>

      <main className="store-main">
        <p className="store-eyebrow">THE DIGITAL EDIT</p>

        <h1>
          Find your next <em>little something.</em>
        </h1>

        <p className="store-intro">
          Explore thoughtful digital tools for planning your days,
          creating content and growing your business.
        </p>

        <section
          className="shop-filter-panel"
          aria-label="Search and filter products"
        >
          <div className="shop-search-field">
            <label htmlFor="shop-product-search">Search products</label>

            <div className="shop-search-input-wrap">
              <svg
                className="shop-search-icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle cx="10.8" cy="10.8" r="6.8" />
                <path d="m16 16 4.5 4.5" />
              </svg>

              <input
                id="shop-product-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Try planner, social media or business"
                autoComplete="off"
              />

              {searchQuery && (
                <button
                  className="shop-search-clear"
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="shop-filter-controls">
            <div className="shop-filter-field">
              <label htmlFor="shop-category-filter">Category</label>

              <select
                id="shop-category-filter"
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
              >
                <option value="ALL">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="shop-filter-field">
              <label htmlFor="shop-sort">Sort by</label>

              <select
                id="shop-sort"
                value={sortOption}
                onChange={(event) =>
                  setSortOption(event.target.value as SortOption)
                }
              >
                <option value="featured">Featured</option>
                <option value="name-asc">Name: A to Z</option>
                <option value="name-desc">Name: Z to A</option>
              </select>
            </div>
          </div>

          <div className="shop-filter-footer">
            <p aria-live="polite" className="shop-results-count">
              <strong>{loading ? "…" : filteredProducts.length}</strong>{" "}
              {filteredProducts.length === 1 ? "product" : "products"} found
            </p>

            {hasActiveFilters && (
              <button
                className="shop-clear-filters"
                type="button"
                onClick={clearFilters}
              >
                Clear filters <span aria-hidden="true">↺</span>
              </button>
            )}
          </div>
        </section>

        {loading ? (
          <section className="shop-no-results" aria-live="polite">
            <h2>Preparing your collection…</h2>
            <p>We're loading the latest products from Clearfern Studio.</p>
          </section>
        ) : loadError ? (
          <section className="shop-no-results" role="alert">
            <h2>Something went wrong</h2>
            <p>{loadError}</p>
            <button
              className="shop-reset-button"
              type="button"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </section>
        ) : filteredProducts.length > 0 ? (
          <div className="store-product-grid shop-results-grid">
            {filteredProducts.map((product) => {
              const style = getProductStyle(
                product.categorySlug,
                product.format,
              );

              return (
                <Link
                  className="store-product-card"
                  to={`/product/${product.slug}`}
                  key={product.id}
                >
                  <div className={`store-product-art ${style}`}>
                    {product.cover_image_url ? (
                      <img
                        className="store-product-cover"
                        src={product.cover_image_url}
                        alt={product.name}
                        loading="lazy"
                      />
                    ) : (
                      <>
                        <span className="store-product-label">
                          {product.categoryName}
                        </span>

                        {style === "product-planner" && (
                          <div className="mini-planner">
                            <span className="mini-planner-title">
                              {product.name}
                            </span>
                            <span className="mini-planner-subtitle">
                              A FRESH PAGE
                            </span>
                            <div className="mini-days">
                              {["M", "T", "W", "T", "F", "S", "S"].map(
                                (day, i) => (
                                  <span key={`${day}-${i}`}>{day}</span>
                                ),
                              )}
                            </div>
                            <div className="mini-lines">
                              <i />
                              <i />
                              <i />
                              <i />
                            </div>
                          </div>
                        )}

                        {style === "product-social" && (
                          <div className="mini-social">
                            <span>YOUR BRAND,</span>
                            <strong>your story.</strong>
                            <span className="social-decoration">✳</span>
                          </div>
                        )}

                        {style === "product-business" && (
                          <div className="mini-workbook">
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

                    {product.is_featured && (
                      <span className="store-preview-tag">Featured</span>
                    )}
                  </div>

                  <div className="store-product-info">
                    <span className="store-product-category">
                      {product.categoryName}
                    </span>
                    <h2>{product.name}</h2>
                    <p>
                      {product.short_description ||
                        product.description ||
                        "A thoughtfully made digital product."}
                    </p>

                    <div className="store-product-bottom">
                      <span>
                        {formatPrice(product.price, product.currency)}
                      </span>
                      <span aria-hidden="true">↗</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <section className="shop-no-results" aria-live="polite">
            <span className="shop-no-results-mark" aria-hidden="true">
              ✳
            </span>

            <h2>
              {products.length === 0
                ? "Our collection is growing."
                : "No products found just yet."}
            </h2>
            <p>
              {products.length === 0
                ? "There are no published products to display yet. Please check back soon."
                : "Try another search term or choose a different category to explore the collection."}
            </p>

            {hasActiveFilters && (
              <button
                className="shop-reset-button"
                type="button"
                onClick={clearFilters}
              >
                Clear search and filters
              </button>
            )}
          </section>
        )}
      </main>

      <footer className="store-footer">
        <span>© {new Date().getFullYear()} Clearfern Studio</span>
        <Link to="/">Back to home ↑</Link>
      </footer>
    </div>
  );
}
