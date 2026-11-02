
import { useState } from "react";
import "./App.css";
import { Link } from "react-router-dom";

const categories = [
  {
    number: "01",
    title: "Planners & organisation",
    description: "Make room for your goals, routines and everyday plans.",
    symbol: "▤",
    style: "planner",
  },
  {
    number: "02",
    title: "Social media templates",
    description: "Create beautiful, consistent content for your brand.",
    symbol: "✳",
    style: "social",
  },
  {
    number: "03",
    title: "Business resources",
    description: "Practical tools to help you run and grow your business.",
    symbol: "↗",
    style: "business",
  },
];

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="site-shell">
      <div className="announcement-bar">
        Thoughtfully made digital goods for everyday life.
      </div>

      <header className="site-header">
        <a className="wordmark" href="#home" aria-label="Clearfern Studio home">
          <span className="wordmark-name">clearfern studio</span>
          <span className="wordmark-subtitle">DIGITAL GOODS, THOUGHTFULLY MADE</span>
        </a>

        <nav
          className={`main-nav${mobileMenuOpen ? " is-open" : ""}`}
          id="main-navigation"
          aria-label="Main navigation"
        >
          <Link to="/shop" onClick={closeMobileMenu}>Shop all</Link>
          <a href="#categories" onClick={closeMobileMenu}>Collections</a>
          <a href="#about" onClick={closeMobileMenu}>Our story</a>
        </nav>

        <button
          className={`mobile-menu-toggle${mobileMenuOpen ? " is-open" : ""}`}
          type="button"
          aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-controls="main-navigation"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>

        <a className="header-cart" href="/shop" aria-label="Shopping bag" onClick={closeMobileMenu}>
          <span>Bag</span>
          <span className="cart-count">0</span>
        </a>
      </header>

      <main>
        <section className="hero-section" id="home">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="eyebrow-line" />
              A LITTLE SPACE TO GROW
            </p>

            <h1>
              Make space
              <br />
              for <em>what matters.</em>
            </h1>

            <p className="hero-description">
              Thoughtfully designed digital tools to help you plan your days,
              bring your ideas to life and grow your business — one small step
              at a time.
            </p>

            <div className="hero-actions">
              <Link className="button button-primary" to="/shop">
  Explore the shop <span aria-hidden="true">↗</span>
</Link>

              <a className="text-link" href="#categories">
                Find your something <span aria-hidden="true">→</span>
              </a>
            </div>

            <div className="hero-note">
              <span className="note-check">✓</span>
              <span>Instant digital downloads</span>
              <span className="note-divider">·</span>
              <span>Made for real life</span>
            </div>
          </div>

          <div className="hero-art" aria-label="Digital stationery preview">
            <div className="art-sun" />
            <div className="art-caption">A calmer kind of productivity.</div>

            <div className="hero-paper hero-paper-back">
              <span className="paper-small-label">A NOTE TO SELF</span>
              <span className="back-paper-line" />
              <span className="back-paper-line short" />
              <span className="back-paper-line" />
              <span className="back-paper-line medium" />
            </div>

            <div className="hero-paper hero-paper-front">
              <div className="mockup-topline">
                <span>CLEARFERN</span>
                <span>01 / 07</span>
              </div>
              <p className="mockup-kicker">YOUR WEEK, YOUR WAY</p>
              <h2>
                A fresh
                <br />
                <em>start.</em>
              </h2>
              <div className="mockup-rule" />
              <div className="mockup-task">
                <span className="task-square" />
                <span>Make a little plan</span>
              </div>
              <div className="mockup-task">
                <span className="task-square" />
                <span>Focus on what matters</span>
              </div>
              <div className="mockup-task">
                <span className="task-square" />
                <span>Leave room to breathe</span>
              </div>
              <div className="mockup-footer">SMALL STEPS COUNT</div>
            </div>

            <div className="hero-sticker">
              <span>made for</span>
              <strong>your kind<br />of everyday</strong>
              <span className="sticker-star">✳</span>
            </div>

            <div className="art-bottom-note">
              <span className="art-bottom-dot" />
              DIGITAL PLANNERS · CREATIVE TOOLS · BUSINESS RESOURCES
            </div>
          </div>
        </section>

        <section className="trust-strip" aria-label="Store benefits">
          <div><span>✳</span> Thoughtfully designed</div>
          <div><span>↗</span> Ready when you are</div>
          <div><span>♡</span> Made for everyday life</div>
        </section>

        <section className="categories-section section-pad" id="categories">
          <div className="section-heading">
            <div>
              <p className="eyebrow">A PLACE TO BEGIN</p>
              <h2>A little something for <em>your next step.</em></h2>
            </div>
            <p className="section-intro">
              Whether you're organising your week, creating content or building
              a business, start with what you need most.
            </p>
          </div>

          <div className="category-grid">
            {categories.map((category) => (
              <a
                className={`category-card category-${category.style}`}
                href="/shop"
                key={category.number}
              >
                <div className="category-card-top">
                  <span className="category-number">{category.number}</span>
                  <span className="category-arrow">↗</span>
                </div>
                <div className="category-art" aria-hidden="true">
                  <span className="category-symbol">{category.symbol}</span>
                  <span className="category-art-caption">
                    {category.style === "planner"
                      ? "PLAN WITH PURPOSE"
                      : category.style === "social"
                        ? "CREATE WITH CONFIDENCE"
                        : "GROW AT YOUR PACE"}
                  </span>
                </div>
                <h3>{category.title}</h3>
                <p>{category.description}</p>
                <span className="category-link">
                  Explore collection <span>→</span>
                </span>
              </a>
            ))}
          </div>
        </section>

        <section className="featured-section section-pad" id="shop">
  <div className="section-heading featured-heading">
    <div>
      <p className="eyebrow">THE DIGITAL EDIT</p>
      <h2>
        Made with intention. <em>Ready for you.</em>
      </h2>
    </div>
    <p className="section-intro">
      Explore thoughtful digital tools for planning, creativity and business.
    </p>
  </div>

  <div className="home-shop-cta">
    <p>Find the tool that fits your next step.</p>
    <Link className="button button-primary" to="/shop">
      Explore all products <span aria-hidden="true">↗</span>
    </Link>
  </div>
</section>

        <section className="brand-note-section" id="about">
          <div className="brand-note-art" aria-hidden="true">
            <div className="note-card">
              <span className="note-card-kicker">A GENTLE REMINDER</span>
              <span className="note-card-main">
                You don't have
                <br />
                to do it all.
              </span>
              <span className="note-card-flower">✳</span>
              <span className="note-card-footer">ONE THING AT A TIME.</span>
            </div>
          </div>
          <div className="brand-note-copy">
            <p className="eyebrow">THE CLEARFERN WAY</p>
            <h2>Useful things.<br /><em>Less overwhelm.</em></h2>
            <p>
              We believe the right tool can make a busy day feel lighter, a
              creative idea feel possible and a small business feel a little
              more manageable.
            </p>
            <p>
              Clearfern Studio is being built around digital products that are
              practical, considered and easy to make your own.
            </p>
            <a className="text-link" href="#categories">
              Find your next step <span>→</span>
            </a>
          </div>
        </section>

        <section className="newsletter-section">
          <div className="newsletter-mark" aria-hidden="true">✳</div>
          <p className="eyebrow">A LITTLE GOOD THING IN YOUR INBOX</p>
          <h2>Make room for <em>good ideas.</em></h2>
          <p>
            Updates, creative inspiration and a first look at new digital
            products.
          </p>
          <span className="newsletter-note">
            Our mailing list is coming soon.
          </span>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-main">
          <a className="wordmark footer-wordmark" href="#home">
            <span className="wordmark-name">clearfern studio</span>
            <span className="wordmark-subtitle">DIGITAL GOODS, THOUGHTFULLY MADE</span>
          </a>
          <p>Thoughtful digital tools for your everyday.</p>
          <a className="back-to-top" href="#home">Back to top ↑</a>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Clearfern Studio</span>
          <span>Made with care, for real life.</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
