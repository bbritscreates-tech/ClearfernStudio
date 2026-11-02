
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { products } from "../data/products";
import "./StorePages.css";

type CategoryFilter = "ALL" | "PLANNING" | "CREATIVE" | "BUSINESS";
type SortOption = "featured" | "name-asc" | "name-desc";

const categoryOptions: { value: CategoryFilter; label: string }[] = [
  { value: "ALL", label: "All categories" },
  { value: "PLANNING", label: "Planners & organisation" },
  { value: "CREATIVE", label: "Social media templates" },
  { value: "BUSINESS", label: "Business resources" },
];

export default function ShopPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("ALL");
  const [sortOption, setSortOption] =
    useState<SortOption>("featured");

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();

    const matchingProducts = products.filter((product) => {
      const matchesCategory =
        selectedCategory === "ALL" ||
        product.category === selectedCategory;

      const searchableText = [
        product.name,
        product.description,
        product.category,
        product.label,
        product.slug,
        product.style,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();

      return matchesCategory &&
        (!query || searchableText.includes(query));
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

    return matchingProducts;
  }, [searchQuery, selectedCategory, sortOption]);

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
            mobileMenuOpen
              ? "Close navigation menu"
              : "Open navigation menu"
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
            <label htmlFor="shop-product-search">
              Search products
            </label>

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
                onChange={(event) =>
                  setSearchQuery(event.target.value)
                }
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
              <label htmlFor="shop-category-filter">
                Category
              </label>

              <select
                id="shop-category-filter"
                value={selectedCategory}
                onChange={(event) =>
                  setSelectedCategory(
                    event.target.value as CategoryFilter,
                  )
                }
              >
                {categoryOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
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
                  setSortOption(
                    event.target.value as SortOption,
                  )
                }
              >
                <option value="featured">Featured</option>
                <option value="name-asc">Name: A to Z</option>
                <option value="name-desc">Name: Z to A</option>
              </select>
            </div>
          </div>

          <div className="shop-filter-footer">
            <p
              aria-live="polite"
              className="shop-results-count"
            >
              <strong>{filteredProducts.length}</strong>{" "}
              {filteredProducts.length === 1
                ? "product"
                : "products"}{" "}
              found
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

        {filteredProducts.length > 0 ? (
          <div className="store-product-grid shop-results-grid">
            {filteredProducts.map((product) => (
              <Link
                className="store-product-card"
                to={`/product/${product.slug}`}
                key={product.slug}
              >
                <div className={`store-product-art ${product.style}`}>
                  <span className="store-product-label">
                    {product.label}
                  </span>

                  {product.style === "product-planner" && (
                    <div className="mini-planner">
                      <span className="mini-planner-title">
                        the weekly reset
                      </span>
                      <span className="mini-planner-subtitle">
                        A FRESH PAGE
                      </span>
                      <div className="mini-days">
                        {["M", "T", "W", "T", "F", "S", "S"].map(
                          (day, i) => (
                            <span key={`${day}-${i}`}>
                              {day}
                            </span>
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

                  {product.style === "product-social" && (
                    <div className="mini-social">
                      <span>YOUR BRAND,</span>
                      <strong>your story.</strong>
                      <span className="social-decoration">✳</span>
                    </div>
                  )}

                  {product.style === "product-business" && (
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

                  <span className="store-preview-tag">
                    Preview only
                  </span>
                </div>

                <div className="store-product-info">
                  <span className="store-product-category">
                    {product.category}
                  </span>
                  <h2>{product.name}</h2>
                  <p>{product.description}</p>

                  <div className="store-product-bottom">
                    <span>Coming soon</span>
                    <span aria-hidden="true">↗</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <section
            className="shop-no-results"
            aria-live="polite"
          >
            <span
              className="shop-no-results-mark"
              aria-hidden="true"
            >
              ✳
            </span>

            <h2>No products found just yet.</h2>
            <p>
              Try another search term or choose a different
              category to explore the collection.
            </p>

            <button
              className="shop-reset-button"
              type="button"
              onClick={clearFilters}
            >
              Clear search and filters
            </button>
          </section>
        )}

        <p className="store-disclaimer">
          These are illustrative previews. Products are not
          available to purchase yet.
        </p>
      </main>

      <footer className="store-footer">
        <span>
          © {new Date().getFullYear()} Clearfern Studio
        </span>
        <Link to="/">Back to home ↑</Link>
      </footer>
    </div>
  );
}
