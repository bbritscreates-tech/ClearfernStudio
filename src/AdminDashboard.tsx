
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import "./AdminDashboard.css";

type ProductStatus = "draft" | "active" | "archived";

type ProductFormat = {
  id: string;
  name: string;
  slug: string;
  description: string;
  file_extension: string;
  is_active: boolean;
  sort_order: number;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_zar: number;
  status: ProductStatus;
  created_at: string;
  category_id: string | null;
  subcategory_id: string | null;
  product_format: string;
  cover_image_path: string | null;
  file_path: string | null;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  parent_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

type ProductForm = {
  id: string | null;
  name: string;
  description: string;
  price_zar: string;
  status: ProductStatus;
  category_id: string;
  subcategory_id: string;
  product_format: string;
};

type CategoryForm = {
  id: string | null;
  name: string;
  description: string;
  parent_id: string;
  is_active: boolean;
  sort_order: string;
};

type FormatForm = {
  id: string | null;
  name: string;
  description: string;
  file_extension: string;
  is_active: boolean;
  sort_order: string;
};

const emptyForm: ProductForm = {
  id: null,
  name: "",
  description: "",
  price_zar: "",
  status: "draft",
  category_id: "",
  subcategory_id: "",
  product_format: "pdf",
};

const emptyCategoryForm: CategoryForm = {
  id: null,
  name: "",
  description: "",
  parent_id: "",
  is_active: true,
  sort_order: "0",
};

const emptyFormatForm: FormatForm = {
  id: null,
  name: "",
  description: "",
  file_extension: "",
  is_active: true,
  sort_order: "0",
};

function makeSlug(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .trim()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(price);
}

export default function AdminDashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formats, setFormats] = useState<ProductFormat[]>([]);

  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingFormats, setLoadingFormats] = useState(false);

  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingFormat, setSavingFormat] = useState(false);
  const [uploadingAssets, setUploadingAssets] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [downloadFile, setDownloadFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);

  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [categoryForm, setCategoryForm] =
    useState<CategoryForm>(emptyCategoryForm);
  const [formatForm, setFormatForm] =
    useState<FormatForm>(emptyFormatForm);

  const [activePage, setActivePage] = useState("Overview");
  const [productSearch, setProductSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [formatSearch, setFormatSearch] = useState("");

  const checkAdmin = useCallback(async (current: Session | null) => {
    setSession(current);
    setIsAdmin(false);

    if (!current) {
      setCheckingSession(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", current.user.id)
      .maybeSingle();

    if (error) {
      setPageError("We couldn't verify your account permissions.");
      setCheckingSession(false);
      return;
    }

    if (data?.role === "admin") {
      setIsAdmin(true);
      setPageError("");
    } else {
      setPageError("This account does not have administrator access.");
      await supabase.auth.signOut();
      setSession(null);
    }

    setCheckingSession(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) void checkAdmin(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) void checkAdmin(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [checkAdmin]);

  const loadProducts = useCallback(async () => {
    if (!isAdmin) return;

    setLoadingProducts(true);

    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, slug, description, price_zar, status, created_at, category_id, subcategory_id, product_format, cover_image_path, file_path",
      )
      .order("created_at", { ascending: false });

    if (error) {
      setPageError(`Couldn't load products: ${error.message}`);
    } else {
      setProducts((data ?? []) as Product[]);
    }

    setLoadingProducts(false);
  }, [isAdmin]);

  const loadCategories = useCallback(async () => {
    if (!isAdmin) return;

    setLoadingCategories(true);

    const { data, error } = await supabase
      .from("categories")
      .select(
        "id, name, slug, description, parent_id, is_active, sort_order, created_at",
      )
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      setPageError(`Couldn't load categories: ${error.message}`);
    } else {
      setCategories((data ?? []) as Category[]);
    }

    setLoadingCategories(false);
  }, [isAdmin]);

  const loadFormats = useCallback(async () => {
    if (!isAdmin) return;

    setLoadingFormats(true);

    const { data, error } = await supabase
      .from("product_formats")
      .select(
        "id, name, slug, description, file_extension, is_active, sort_order",
      )
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      setPageError(`Couldn't load product formats: ${error.message}`);
    } else {
      setFormats((data ?? []) as ProductFormat[]);
    }

    setLoadingFormats(false);
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;

    void loadProducts();
    void loadCategories();
    void loadFormats();
  }, [isAdmin, loadProducts, loadCategories, loadFormats]);

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const formatBySlug = useMemo(
    () => new Map(formats.map((format) => [format.slug, format])),
    [formats],
  );

  const parentCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.parent_id === null &&
          (category.is_active || category.id === categoryForm.parent_id),
      ),
    [categories, categoryForm.parent_id],
  );

  const productCategories = useMemo(
    () =>
      categories.filter(
        (category) => category.is_active && category.parent_id === null,
      ),
    [categories],
  );

  const availableSubcategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.is_active && category.parent_id === form.category_id,
      ),
    [categories, form.category_id],
  );

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return products;

    return products.filter((product) => {
      const categoryName = product.category_id
        ? categoryById.get(product.category_id)?.name ?? ""
        : "";
      const subcategoryName = product.subcategory_id
        ? categoryById.get(product.subcategory_id)?.name ?? ""
        : "";
      const formatName = formatBySlug.get(product.product_format)?.name ?? "";

      return [
        product.name,
        product.slug,
        product.description,
        product.status,
        product.product_format,
        formatName,
        categoryName,
        subcategoryName,
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [products, productSearch, categoryById, formatBySlug]);

  const filteredCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    if (!query) return categories;

    return categories.filter((category) => {
      const parentName = category.parent_id
        ? categoryById.get(category.parent_id)?.name ?? ""
        : "";

      return [category.name, category.slug, category.description, parentName]
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [categories, categorySearch, categoryById]);

  const filteredFormats = useMemo(() => {
    const query = formatSearch.trim().toLowerCase();
    if (!query) return formats;

    return formats.filter((format) =>
      [
        format.name,
        format.slug,
        format.description,
        format.file_extension,
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [formats, formatSearch]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginBusy(true);
    setLoginError("");
    setPageError("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setLoginError("Login failed. Check your email and password.");
    }

    setPassword("");
    setLoginBusy(false);
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setPageError("Couldn't sign out. Please try again.");
    } else {
      setProducts([]);
      setCategories([]);
      setFormats([]);
      setForm(emptyForm);
      setCategoryForm(emptyCategoryForm);
      setFormatForm(emptyFormatForm);
      setNotice("");
      setPageError("");
    }
  }

  function editProduct(product: Product) {
    setForm({
      id: product.id,
      name: product.name,
      description: product.description ?? "",
      price_zar: String(product.price_zar),
      status: product.status,
      category_id: product.category_id ?? "",
      subcategory_id: product.subcategory_id ?? "",
      product_format: product.product_format,
    });
    setCoverFile(null);
    setDownloadFile(null);
    setGalleryFiles([]);

    setActivePage("Products");
    setNotice("");
    setPageError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSaveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) return;

    const name = form.name.trim();
    const slug = makeSlug(name);
    const price = Number(form.price_zar);

    if (!name || !slug) {
      setPageError("Enter a product name containing letters or numbers.");
      return;
    }

    if (
      !form.price_zar.trim() ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      setPageError("Enter a valid price of zero or more.");
      return;
    }

    if (
      !form.product_format ||
      !formats.some((format) => format.slug === form.product_format)
    ) {
      setPageError("Choose a valid product format.");
      return;
    }

    if (
      form.subcategory_id &&
      !availableSubcategories.some(
        (category) => category.id === form.subcategory_id,
      )
    ) {
      setPageError(
        "Choose a subcategory that belongs to the selected category.",
      );
      return;
    }

    setSaving(true);
    setPageError("");
    setNotice("");

    const values = {
      name,
      slug,
      description: form.description.trim(),
      price_zar: Math.round(price * 100) / 100,
      status: form.status,
      category_id: form.category_id || null,
      subcategory_id: form.subcategory_id || null,
      product_format: form.product_format,
      updated_at: new Date().toISOString(),
    };

    const result = form.id
      ? await supabase.from("products").update(values).eq("id", form.id)
      : await supabase.from("products").insert(values).select("id").single();

    if (result.error) {
      setPageError(
        result.error.code === "23505"
          ? "That product URL already exists. Change the product name and try again."
          : `Couldn't save the product: ${result.error.message}`,
      );
    } else {
      const savedId = form.id ?? (result.data as { id: string } | null)?.id ?? null;
      setNotice(
        form.id
          ? "Product updated. You can now upload or replace its media files below."
          : "Product created. You can now upload its cover, gallery media and downloadable file below.",
      );
      setForm({ ...form, id: savedId });
      await loadProducts();
    }

    setSaving(false);
  }

  function safeFileName(name: string) {
    return name
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "file";
  }

  async function handleUploadAssets() {
    if (!isAdmin || !form.id) {
      setPageError("Save the product first, then upload its files.");
      return;
    }
    if (!coverFile && !downloadFile && galleryFiles.length === 0) {
      setPageError("Choose at least one file to upload.");
      return;
    }

    setUploadingAssets(true);
    setPageError("");
    setNotice("");
    const productId = form.id;
    const productSlug = makeSlug(form.name) || productId;
    const uploadedPaths: { cover_image_path?: string; file_path?: string } = {};

    try {
      if (coverFile) {
        if (!coverFile.type.startsWith("image/")) {
          throw new Error("The cover image must be an image file.");
        }
        const path = `${productId}/cover-${Date.now()}-${safeFileName(coverFile.name)}`;
        const { error } = await supabase.storage.from("product-media").upload(path, coverFile, {
          upsert: false, contentType: coverFile.type,
        });
        if (error) throw new Error(`Cover image upload failed: ${error.message}`);
        uploadedPaths.cover_image_path = path;
      }

      if (downloadFile) {
        const path = `${productId}/${Date.now()}-${safeFileName(downloadFile.name)}`;
        const { error } = await supabase.storage.from("product-files").upload(path, downloadFile, {
          upsert: false, contentType: downloadFile.type || "application/octet-stream",
        });
        if (error) throw new Error(`Downloadable file upload failed: ${error.message}`);
        uploadedPaths.file_path = path;
      }

      if (Object.keys(uploadedPaths).length) {
        const { error } = await supabase.from("products").update({
          ...uploadedPaths, updated_at: new Date().toISOString(),
        }).eq("id", productId);
        if (error) throw new Error(`Files uploaded, but product details couldn't be updated: ${error.message}`);
      }

      let galleryCount = 0;
      for (const file of galleryFiles) {
        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");
        if (!isImage && !isVideo) {
          throw new Error(`${file.name} is not a supported image or video.`);
        }
        const path = `${productId}/gallery-${Date.now()}-${galleryCount}-${safeFileName(file.name)}`;
        const { error: uploadError } = await supabase.storage.from("product-media").upload(path, file, {
          upsert: false, contentType: file.type,
        });
        if (uploadError) throw new Error(`Couldn't upload ${file.name}: ${uploadError.message}`);
        const { error: rowError } = await supabase.from("product_media").insert({
          product_id: productId, media_type: isImage ? "image" : "video",
          storage_path: path, alt_text: file.name, sort_order: galleryCount,
        });
        if (rowError) throw new Error(`Uploaded ${file.name}, but couldn't save its media record: ${rowError.message}`);
        galleryCount += 1;
      }

      setNotice(`Upload complete for ${productSlug}.${coverFile ? " Cover image saved." : ""}${downloadFile ? " Private downloadable file saved." : ""}${galleryCount ? ` ${galleryCount} gallery item(s) saved.` : ""}`);
      setCoverFile(null);
      setDownloadFile(null);
      setGalleryFiles([]);
      await loadProducts();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "An unexpected upload error occurred.");
    } finally {
      setUploadingAssets(false);
    }
  }

  async function changeStatus(
    product: Product,
    status: ProductStatus,
  ) {
    setPageError("");
    setNotice("");

    const { error } = await supabase
      .from("products")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", product.id);

    if (error) {
      setPageError(`Couldn't update status: ${error.message}`);
    } else {
      setNotice(`“${product.name}” is now ${status}.`);
      await loadProducts();
    }
  }

  function editCategory(category: Category) {
    setCategoryForm({
      id: category.id,
      name: category.name,
      description: category.description ?? "",
      parent_id: category.parent_id ?? "",
      is_active: category.is_active,
      sort_order: String(category.sort_order),
    });

    setNotice("");
    setPageError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSaveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) return;

    const name = categoryForm.name.trim();
    const slug = makeSlug(name);
    const sortOrder = Number(categoryForm.sort_order);

    if (!name || !slug) {
      setPageError("Enter a category name containing letters or numbers.");
      return;
    }

    if (!Number.isInteger(sortOrder)) {
      setPageError("Sort order must be a whole number.");
      return;
    }

    if (categoryForm.parent_id === categoryForm.id && categoryForm.id) {
      setPageError("A category cannot be its own parent.");
      return;
    }

    if (
      categoryForm.parent_id &&
      !categories.some(
        (category) =>
          category.id === categoryForm.parent_id &&
          category.parent_id === null,
      )
    ) {
      setPageError("Subcategories must belong directly to a main category.");
      return;
    }

    if (
      categoryForm.id &&
      categories.some(
        (category) =>
          category.parent_id === categoryForm.id &&
          categoryForm.parent_id !== "",
      )
    ) {
      setPageError(
        "This category has subcategories. Make it a main category before changing its parent.",
      );
      return;
    }

    setSavingCategory(true);
    setPageError("");
    setNotice("");

    const values = {
      name,
      slug,
      description: categoryForm.description.trim(),
      parent_id: categoryForm.parent_id || null,
      is_active: categoryForm.is_active,
      sort_order: sortOrder,
      updated_at: new Date().toISOString(),
    };

    const result = categoryForm.id
      ? await supabase
          .from("categories")
          .update(values)
          .eq("id", categoryForm.id)
      : await supabase.from("categories").insert(values);

    if (result.error) {
      setPageError(
        result.error.code === "23505"
          ? "That category URL already exists. Try a different name."
          : `Couldn't save the category: ${result.error.message}`,
      );
    } else {
      setNotice(
        categoryForm.id
          ? "Category updated successfully."
          : "Category created successfully.",
      );
      setCategoryForm(emptyCategoryForm);
      await loadCategories();
    }

    setSavingCategory(false);
  }

  async function toggleCategory(category: Category) {
    const hasActiveChildren = categories.some(
      (item) => item.parent_id === category.id && item.is_active,
    );

    if (category.is_active && hasActiveChildren) {
      setPageError("Deactivate this category's subcategories first.");
      return;
    }

    setPageError("");
    setNotice("");

    const { error } = await supabase
      .from("categories")
      .update({
        is_active: !category.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", category.id);

    if (error) {
      setPageError(`Couldn't update category: ${error.message}`);
    } else {
      setNotice(
        `${category.name} is now ${
          category.is_active ? "inactive" : "active"
        }.`,
      );
      await loadCategories();
    }
  }

  function editFormat(format: ProductFormat) {
    setFormatForm({
      id: format.id,
      name: format.name,
      description: format.description ?? "",
      file_extension: format.file_extension ?? "",
      is_active: format.is_active,
      sort_order: String(format.sort_order),
    });

    setNotice("");
    setPageError("");
    setActivePage("Product Formats");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSaveFormat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) return;

    const name = formatForm.name.trim();
    const slug = makeSlug(name);
    const sortOrder = Number(formatForm.sort_order);

    if (!name || !slug) {
      setPageError("Enter a format name containing letters or numbers.");
      return;
    }

    if (!Number.isInteger(sortOrder)) {
      setPageError("Sort order must be a whole number.");
      return;
    }

    setSavingFormat(true);
    setPageError("");
    setNotice("");

    const values = {
      name,
      slug,
      description: formatForm.description.trim(),
      file_extension: formatForm.file_extension.trim(),
      is_active: formatForm.is_active,
      sort_order: sortOrder,
      updated_at: new Date().toISOString(),
    };

    const result = formatForm.id
      ? await supabase
          .from("product_formats")
          .update(values)
          .eq("id", formatForm.id)
      : await supabase.from("product_formats").insert(values);

    if (result.error) {
      setPageError(
        result.error.code === "23505"
          ? "A format with that name or URL already exists. Try a different name."
          : `Couldn't save the format: ${result.error.message}`,
      );
    } else {
      setNotice(
        formatForm.id
          ? "Product format updated successfully."
          : "Product format created successfully.",
      );
      setFormatForm(emptyFormatForm);
      await loadFormats();
    }

    setSavingFormat(false);
  }

  async function toggleFormat(format: ProductFormat) {
    if (
      format.is_active &&
      products.some((product) => product.product_format === format.slug)
    ) {
      setPageError(
        "This format is assigned to products. Change those products to another format before deactivating it.",
      );
      return;
    }

    setPageError("");
    setNotice("");

    const { error } = await supabase
      .from("product_formats")
      .update({
        is_active: !format.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", format.id);

    if (error) {
      setPageError(`Couldn't update format: ${error.message}`);
    } else {
      setNotice(
        `${format.name} is now ${
          format.is_active ? "inactive" : "active"
        }.`,
      );
      await loadFormats();
    }
  }

  if (checkingSession) {
    return (
      <div className="admin-screen">
        <div className="admin-loading">Checking your session…</div>
      </div>
    );
  }

  if (!session || !isAdmin) {
    return (
      <div className="admin-screen">
        <div className="login-card">
          <a className="admin-brand" href="/">
            <span className="admin-brand-mark">C</span>
            <span>Clearfern Studio</span>
          </a>

          <span className="admin-eyebrow">PRIVATE ADMIN AREA</span>
          <h1>Welcome back.</h1>
          <p>Sign in with your administrator account.</p>

          {loginError && (
            <div className="admin-alert error" role="alert">
              {loginError}
            </div>
          )}
          {pageError && (
            <div className="admin-alert error" role="alert">
              {pageError}
            </div>
          )}

          <form className="admin-form login-form" onSubmit={handleLogin}>
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <button
              className="admin-button primary full-width"
              disabled={loginBusy}
              type="submit"
            >
              {loginBusy ? "Signing in…" : "Sign in securely"}
            </button>
          </form>

          <a className="back-to-store" href="/">
            ← Return to storefront
          </a>
        </div>
      </div>
    );
  }

  const activeCount = products.filter(
    (product) => product.status === "active",
  ).length;
  const draftCount = products.filter(
    (product) => product.status === "draft",
  ).length;
  const activeFormatCount = formats.filter(
    (format) => format.is_active,
  ).length;

  const navigation = [
    ["Overview", "⌂"],
    ["Products", "▧"],
    ["Categories", "▤"],
    ["Product Formats", "▦"],
    ["Orders", "⇄"],
    ["Reports", "▥"],
    ["Delivery", "↓"],
    ["Settings", "⚙"],
  ];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/">
          <span className="admin-brand-mark">C</span>
          <span>Clearfern Studio</span>
        </a>

        <div className="sidebar-label">WORKSPACE</div>

        <nav className="admin-nav" aria-label="Admin navigation">
          {navigation.map(([name, symbol]) => (
            <button
              key={name}
              className={
                activePage === name
                  ? "admin-nav-item selected"
                  : "admin-nav-item"
              }
              onClick={() => {
                setActivePage(name);
                setPageError("");
                setNotice("");
              }}
              type="button"
            >
              <span className="nav-icon">{symbol}</span>
              {name}
              {["Orders", "Reports", "Delivery", "Settings"].includes(name) && (
                <span className="nav-soon">Later</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="account-avatar">
            {(session.user.email ?? "A").charAt(0).toUpperCase()}
          </div>
          <div className="account-copy">
            <strong>Administrator</strong>
            <span>{session.user.email}</span>
          </div>
          <button
            className="logout-button"
            onClick={() => void handleLogout()}
            type="button"
            aria-label="Sign out"
          >
            ↗
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="admin-eyebrow">CLEARFERN STUDIO / ADMIN</span>
            <h1>{activePage}</h1>
          </div>
          <div className="admin-topbar-actions">
            <span className="connection-status">
              <span />
              Database connected
            </span>
            <a className="admin-button secondary" href="/">
              View storefront ↗
            </a>
          </div>
        </header>

        {pageError && (
          <div className="admin-alert error" role="alert">
            {pageError}
          </div>
        )}
        {notice && (
          <div className="admin-alert success" role="status">
            {notice}
          </div>
        )}

        {activePage === "Overview" && (
          <>
            <section className="welcome-panel">
              <div>
                <span className="admin-eyebrow">
                  YOUR BUSINESS, AT A GLANCE
                </span>
                <h2>A good place to begin.</h2>
                <p>
                  Manage your products, categories and digital formats
                  from one place.
                </p>
                <button
                  className="admin-button primary"
                  onClick={() => {
                    setForm(emptyForm);
                    setActivePage("Products");
                  }}
                  type="button"
                >
                  + Add your first product
                </button>
              </div>
              <div className="welcome-decoration">✳</div>
            </section>

            <section className="metrics-grid">
              <article className="metric-card">
                <span>Total products</span>
                <strong>{products.length}</strong>
                <small>Saved in your database</small>
              </article>
              <article className="metric-card">
                <span>Published products</span>
                <strong>{activeCount}</strong>
                <small>Visible on your storefront</small>
              </article>
              <article className="metric-card">
                <span>Draft products</span>
                <strong>{draftCount}</strong>
                <small>Hidden from the shop</small>
              </article>
              <article className="metric-card">
                <span>Active formats</span>
                <strong>{activeFormatCount}</strong>
                <small>Available for new products</small>
              </article>
            </section>

            <section className="admin-panel">
              <div className="panel-heading">
                <div>
                  <span className="admin-eyebrow">YOUR CATALOGUE</span>
                  <h2>Recently added products</h2>
                </div>
                <button
                  className="text-button"
                  onClick={() => setActivePage("Products")}
                  type="button"
                >
                  Manage products →
                </button>
              </div>

              {products.length ? (
                <ProductTable
                  products={products.slice(0, 5)}
                  categoryById={categoryById}
                  formatBySlug={formatBySlug}
                  onEdit={editProduct}
                  onStatusChange={changeStatus}
                />
              ) : (
                <div className="admin-empty">
                  <span className="empty-box-icon">▧</span>
                  <h3>Your catalogue is waiting.</h3>
                  <p>Create a product to see it listed here.</p>
                </div>
              )}
            </section>

            <section className="admin-panel">
              <div className="panel-heading">
                <div>
                  <span className="admin-eyebrow">NEXT MILESTONES</span>
                  <h2>Getting ready to sell</h2>
                </div>
              </div>

              <div className="milestone-list">
                <div>
                  <span className="milestone-done">✓</span>
                  <span>
                    <strong>Database connected</strong>
                    <small>Products, categories and formats are stored in Supabase.</small>
                  </span>
                </div>
                <div>
                  <span className="milestone-done">✓</span>
                  <span>
                    <strong>Administrator access</strong>
                    <small>Login and database role checks are enabled.</small>
                  </span>
                </div>
                <div>
                  <span className="milestone-pending">3</span>
                  <span>
                    <strong>Payment checkout</strong>
                    <small>Yoco integration and payment verification are still to come.</small>
                  </span>
                </div>
                <div>
                  <span className="milestone-pending">4</span>
                  <span>
                    <strong>Secure digital delivery</strong>
                    <small>Private file storage and verified downloads are still to come.</small>
                  </span>
                </div>
              </div>
            </section>
          </>
        )}

        {activePage === "Products" && (
          <div className="products-admin-grid">
            <section className="admin-panel product-editor">
              <div className="panel-heading">
                <div>
                  <span className="admin-eyebrow">
                    {form.id ? "EDIT PRODUCT" : "NEW LISTING"}
                  </span>
                  <h2>{form.id ? "Update product" : "Create a product"}</h2>
                </div>
              </div>

              <form className="admin-form" onSubmit={handleSaveProduct}>
                <label htmlFor="product-name">Product name</label>
                <input
                  id="product-name"
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="e.g. Excel Monthly Budget Planner"
                  maxLength={120}
                  required
                />

                <label htmlFor="product-description">Description</label>
                <textarea
                  id="product-description"
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  placeholder="Describe what the customer will receive."
                  rows={5}
                  maxLength={3000}
                />

                <label htmlFor="product-price">
                  Price in South African rand (ZAR)
                </label>
                <input
                  id="product-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price_zar}
                  onChange={(event) =>
                    setForm({ ...form, price_zar: event.target.value })
                  }
                  placeholder="e.g. 99.00"
                  required
                />

                <label htmlFor="product-format">Product format</label>
                <select
                  id="product-format"
                  value={form.product_format}
                  onChange={(event) =>
                    setForm({ ...form, product_format: event.target.value })
                  }
                  required
                >
                  {!formats.some(
                    (format) =>
                      format.slug === form.product_format && format.is_active,
                  ) &&
                    form.product_format && (
                      <option value={form.product_format}>
                        {formatBySlug.get(form.product_format)?.name ??
                          form.product_format}
                        {" (currently inactive)"}
                      </option>
                    )}
                  {formats
                    .filter(
                      (format) =>
                        format.is_active ||
                        format.slug === form.product_format,
                    )
                    .map((format) => (
                      <option key={format.id} value={format.slug}>
                        {format.name}
                        {format.file_extension
                          ? ` (${format.file_extension})`
                          : ""}
                        {!format.is_active ? " — inactive" : ""}
                      </option>
                    ))}
                </select>
                {formats.length === 0 && (
                  <div className="form-note">
                    No formats are available yet. Add a product format
                    before creating a product.
                  </div>
                )}

                <label htmlFor="product-category">Main category</label>
                <select
                  id="product-category"
                  value={form.category_id}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      category_id: event.target.value,
                      subcategory_id: "",
                    })
                  }
                >
                  <option value="">No category assigned</option>
                  {productCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>

                <label htmlFor="product-subcategory">Subcategory</label>
                <select
                  id="product-subcategory"
                  value={form.subcategory_id}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      subcategory_id: event.target.value,
                    })
                  }
                  disabled={!form.category_id}
                >
                  <option value="">No subcategory</option>
                  {availableSubcategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>

                <label htmlFor="product-status">Visibility</label>
                <select
                  id="product-status"
                  value={form.status}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      status: event.target.value as ProductStatus,
                    })
                  }
                >
                  <option value="draft">Draft — hidden from the shop</option>
                  <option value="active">Active — visible in the shop</option>
                  <option value="archived">Archived — hidden from the shop</option>
                </select>

                <div className="form-note">
                  Save the product first. You can then upload its public cover image and preview media, plus its private downloadable file. Keep the product in draft until the listing is ready.
                </div>

                <div className="form-actions">
                  <button
                    className="admin-button primary"
                    disabled={saving || formats.length === 0}
                    type="submit"
                  >
                    {saving
                      ? "Saving…"
                      : form.id
                        ? "Save changes"
                        : "Create product"}
                  </button>
                  {form.id && (
                    <button
                      className="admin-button secondary"
                      onClick={() => setForm(emptyForm)}
                      type="button"
                    >
                      Cancel edit
                    </button>
                  )}
                </div>
              </form>

              {form.id && (
                <section className="asset-upload-panel" aria-labelledby="asset-upload-heading">
                  <div className="panel-heading">
                    <div>
                      <span className="admin-eyebrow">PRODUCT FILES</span>
                      <h3 id="asset-upload-heading">Images, previews & download</h3>
                    </div>
                  </div>
                  <p className="form-note">Cover images and gallery previews are publicly viewable. The actual product download is stored privately and must not be linked directly from the storefront.</p>

                  <label htmlFor="product-cover-file">Cover image</label>
                  <input id="product-cover-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)} />
                  <small className="upload-current">{products.find((item) => item.id === form.id)?.cover_image_path ? `Current file: ${products.find((item) => item.id === form.id)?.cover_image_path}` : "No cover image uploaded yet."}</small>

                  <label htmlFor="product-gallery-files">Gallery images or preview videos</label>
                  <input id="product-gallery-files" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime" onChange={(event) => setGalleryFiles(Array.from(event.target.files ?? []))} />
                  {galleryFiles.length > 0 && <small>{galleryFiles.length} file(s) selected.</small>}

                  <label htmlFor="product-download-file">Downloadable product file (private)</label>
                  <input id="product-download-file" type="file" onChange={(event) => setDownloadFile(event.target.files?.[0] ?? null)} />
                  <small className="upload-current">{products.find((item) => item.id === form.id)?.file_path ? `Current private file: ${products.find((item) => item.id === form.id)?.file_path}` : "No downloadable file uploaded yet."}</small>

                  <button className="admin-button primary" type="button" disabled={uploadingAssets || (!coverFile && !downloadFile && galleryFiles.length === 0)} onClick={() => void handleUploadAssets()}>
                    {uploadingAssets ? "Uploading files…" : "Upload selected files"}
                  </button>
                </section>
              )}
            </section>

            <section className="admin-panel catalogue-panel">
              <div className="panel-heading">
                <div>
                  <span className="admin-eyebrow">DATABASE CATALOGUE</span>
                  <h2>All products ({products.length})</h2>
                </div>
                <button
                  className="icon-button"
                  onClick={() => void loadProducts()}
                  type="button"
                  aria-label="Refresh products"
                >
                  ↻
                </button>
              </div>

              <input
                className="admin-search"
                type="search"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="Search products, formats or categories…"
                aria-label="Search products"
              />

              {loadingProducts ? (
                <div className="admin-empty">Loading products…</div>
              ) : filteredProducts.length === 0 ? (
                <div className="admin-empty">
                  <span className="empty-box-icon">▧</span>
                  <h3>
                    {products.length
                      ? "No matching products"
                      : "No products yet"}
                  </h3>
                  <p>
                    {products.length
                      ? "Try a different search."
                      : "Use the form to create your first listing."}
                  </p>
                </div>
              ) : (
                <ProductTable
                  products={filteredProducts}
                  categoryById={categoryById}
                  formatBySlug={formatBySlug}
                  onEdit={editProduct}
                  onStatusChange={changeStatus}
                />
              )}
            </section>
          </div>
        )}

        {activePage === "Categories" && (
          <div className="products-admin-grid">
            <section className="admin-panel product-editor">
              <div className="panel-heading">
                <div>
                  <span className="admin-eyebrow">
                    {categoryForm.id ? "EDIT CATEGORY" : "NEW CATEGORY"}
                  </span>
                  <h2>
                    {categoryForm.id ? "Update category" : "Create a category"}
                  </h2>
                </div>
              </div>

              <form className="admin-form" onSubmit={handleSaveCategory}>
                <label htmlFor="category-name">Category name</label>
                <input
                  id="category-name"
                  value={categoryForm.name}
                  onChange={(event) =>
                    setCategoryForm({
                      ...categoryForm,
                      name: event.target.value,
                    })
                  }
                  placeholder="e.g. Planners"
                  maxLength={100}
                  required
                />

                <label htmlFor="category-description">Description</label>
                <textarea
                  id="category-description"
                  value={categoryForm.description}
                  onChange={(event) =>
                    setCategoryForm({
                      ...categoryForm,
                      description: event.target.value,
                    })
                  }
                  placeholder="What products belong in this category?"
                  rows={4}
                  maxLength={1000}
                />

                <label htmlFor="category-parent">Parent category</label>
                <select
                  id="category-parent"
                  value={categoryForm.parent_id}
                  onChange={(event) =>
                    setCategoryForm({
                      ...categoryForm,
                      parent_id: event.target.value,
                    })
                  }
                >
                  <option value="">Main category (no parent)</option>
                  {parentCategories
                    .filter((category) => category.id !== categoryForm.id)
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </select>

                <label htmlFor="category-sort-order">Sort order</label>
                <input
                  id="category-sort-order"
                  type="number"
                  step="1"
                  value={categoryForm.sort_order}
                  onChange={(event) =>
                    setCategoryForm({
                      ...categoryForm,
                      sort_order: event.target.value,
                    })
                  }
                  required
                />

                <label className="category-active-label">
                  <input
                    type="checkbox"
                    checked={categoryForm.is_active}
                    onChange={(event) =>
                      setCategoryForm({
                        ...categoryForm,
                        is_active: event.target.checked,
                      })
                    }
                  />
                  Active — available for product assignment
                </label>

                <div className="form-note">
                  Main categories can contain subcategories. Deactivate
                  subcategories before deactivating their parent.
                </div>

                <div className="form-actions">
                  <button
                    className="admin-button primary"
                    disabled={savingCategory}
                    type="submit"
                  >
                    {savingCategory
                      ? "Saving…"
                      : categoryForm.id
                        ? "Save changes"
                        : "Create category"}
                  </button>
                  {categoryForm.id && (
                    <button
                      className="admin-button secondary"
                      onClick={() => setCategoryForm(emptyCategoryForm)}
                      type="button"
                    >
                      Cancel edit
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section className="admin-panel catalogue-panel">
              <div className="panel-heading">
                <div>
                  <span className="admin-eyebrow">YOUR CATEGORY STRUCTURE</span>
                  <h2>Categories ({categories.length})</h2>
                </div>
                <button
                  className="icon-button"
                  onClick={() => void loadCategories()}
                  type="button"
                  aria-label="Refresh categories"
                >
                  ↻
                </button>
              </div>

              <input
                className="admin-search"
                type="search"
                value={categorySearch}
                onChange={(event) => setCategorySearch(event.target.value)}
                placeholder="Search categories…"
                aria-label="Search categories"
              />

              {loadingCategories ? (
                <div className="admin-empty">Loading categories…</div>
              ) : filteredCategories.length === 0 ? (
                <div className="admin-empty">
                  <span className="empty-box-icon">▤</span>
                  <h3>
                    {categories.length
                      ? "No matching categories"
                      : "No categories yet"}
                  </h3>
                  <p>Create a main category, then add subcategories.</p>
                </div>
              ) : (
                <div className="category-admin-list">
                  {filteredCategories.map((category) => {
                    const parent = category.parent_id
                      ? categoryById.get(category.parent_id)
                      : null;
                    const childCount = categories.filter(
                      (item) => item.parent_id === category.id,
                    ).length;

                    return (
                      <article
                        className="category-admin-row"
                        key={category.id}
                      >
                        <div className="category-admin-info">
                          <div className="category-admin-title">
                            <strong>
                              {parent ? "↳ " : ""}
                              {category.name}
                            </strong>
                            <span
                              className={`status-pill status-${
                                category.is_active ? "active" : "archived"
                              }`}
                            >
                              {category.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <small>
                            {parent
                              ? `Subcategory of ${parent.name}`
                              : "Main category"}
                            {" · "}
                            Order: {category.sort_order}
                            {" · "}
                            {childCount > 0
                              ? `${childCount} subcategor${
                                  childCount === 1 ? "y" : "ies"
                                }`
                              : "No subcategories"}
                          </small>
                          {category.description && <p>{category.description}</p>}
                          <small>/{category.slug}</small>
                        </div>

                        <div className="category-admin-actions">
                          <button
                            className="small-action"
                            onClick={() => editCategory(category)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="small-action"
                            onClick={() => void toggleCategory(category)}
                            type="button"
                          >
                            {category.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {activePage === "Product Formats" && (
          <div className="products-admin-grid">
            <section className="admin-panel product-editor">
              <div className="panel-heading">
                <div>
                  <span className="admin-eyebrow">
                    {formatForm.id ? "EDIT FORMAT" : "NEW FORMAT"}
                  </span>
                  <h2>
                    {formatForm.id ? "Update format" : "Create a format"}
                  </h2>
                </div>
              </div>

              <form className="admin-form" onSubmit={handleSaveFormat}>
                <label htmlFor="format-name">Format name</label>
                <input
                  id="format-name"
                  value={formatForm.name}
                  onChange={(event) =>
                    setFormatForm({
                      ...formatForm,
                      name: event.target.value,
                    })
                  }
                  placeholder="e.g. Excel Workbook"
                  maxLength={100}
                  required
                />

                <label htmlFor="format-description">Description</label>
                <textarea
                  id="format-description"
                  value={formatForm.description}
                  onChange={(event) =>
                    setFormatForm({
                      ...formatForm,
                      description: event.target.value,
                    })
                  }
                  placeholder="Describe this type of digital product."
                  rows={4}
                  maxLength={1000}
                />

                <label htmlFor="format-extension">
                  File extension or delivery type
                </label>
                <input
                  id="format-extension"
                  value={formatForm.file_extension}
                  onChange={(event) =>
                    setFormatForm({
                      ...formatForm,
                      file_extension: event.target.value,
                    })
                  }
                  placeholder="e.g. .xlsx or .xlsx, .xls"
                  maxLength={100}
                />

                <label htmlFor="format-sort-order">Sort order</label>
                <input
                  id="format-sort-order"
                  type="number"
                  step="1"
                  value={formatForm.sort_order}
                  onChange={(event) =>
                    setFormatForm({
                      ...formatForm,
                      sort_order: event.target.value,
                    })
                  }
                  required
                />

                <label className="category-active-label">
                  <input
                    type="checkbox"
                    checked={formatForm.is_active}
                    onChange={(event) =>
                      setFormatForm({
                        ...formatForm,
                        is_active: event.target.checked,
                      })
                    }
                  />
                  Active — available when creating products
                </label>

                <div className="form-note">
                  A format name creates its internal URL slug automatically.
                  For example, “Excel Workbook” becomes “excel-workbook”.
                  Existing products keep their assigned format when you
                  change its display name.
                </div>

                <div className="form-actions">
                  <button
                    className="admin-button primary"
                    disabled={savingFormat}
                    type="submit"
                  >
                    {savingFormat
                      ? "Saving…"
                      : formatForm.id
                        ? "Save changes"
                        : "Create format"}
                  </button>
                  {formatForm.id && (
                    <button
                      className="admin-button secondary"
                      onClick={() => setFormatForm(emptyFormatForm)}
                      type="button"
                    >
                      Cancel edit
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section className="admin-panel catalogue-panel">
              <div className="panel-heading">
                <div>
                  <span className="admin-eyebrow">DIGITAL PRODUCT TYPES</span>
                  <h2>Product formats ({formats.length})</h2>
                </div>
                <button
                  className="icon-button"
                  onClick={() => void loadFormats()}
                  type="button"
                  aria-label="Refresh product formats"
                >
                  ↻
                </button>
              </div>

              <input
                className="admin-search"
                type="search"
                value={formatSearch}
                onChange={(event) => setFormatSearch(event.target.value)}
                placeholder="Search product formats…"
                aria-label="Search product formats"
              />

              {loadingFormats ? (
                <div className="admin-empty">Loading product formats…</div>
              ) : filteredFormats.length === 0 ? (
                <div className="admin-empty">
                  <span className="empty-box-icon">▦</span>
                  <h3>
                    {formats.length
                      ? "No matching formats"
                      : "No product formats yet"}
                  </h3>
                  <p>Create a format to use it when listing products.</p>
                </div>
              ) : (
                <div className="category-admin-list">
                  {filteredFormats.map((format) => {
                    const assignedCount = products.filter(
                      (product) => product.product_format === format.slug,
                    ).length;

                    return (
                      <article
                        className="category-admin-row"
                        key={format.id}
                      >
                        <div className="category-admin-info">
                          <div className="category-admin-title">
                            <strong>{format.name}</strong>
                            <span
                              className={`status-pill status-${
                                format.is_active ? "active" : "archived"
                              }`}
                            >
                              {format.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <small>
                            {format.file_extension || "No extension specified"}
                            {" · "}
                            Order: {format.sort_order}
                            {" · "}
                            {assignedCount} product
                            {assignedCount === 1 ? "" : "s"}
                          </small>
                          {format.description && <p>{format.description}</p>}
                          <small>/{format.slug}</small>
                        </div>

                        <div className="category-admin-actions">
                          <button
                            className="small-action"
                            onClick={() => editFormat(format)}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="small-action"
                            onClick={() => void toggleFormat(format)}
                            type="button"
                          >
                            {format.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {["Orders", "Reports", "Delivery", "Settings"].includes(activePage) && (
          <section className="admin-panel future-panel">
            <span className="future-icon">✳</span>
            <span className="admin-eyebrow">COMING IN A LATER STEP</span>
            <h2>{activePage} will be connected next.</h2>
            <p>
              This section is not processing live business data yet. We'll
              build it after the product catalogue and category structure
              are working correctly.
            </p>
            <button
              className="admin-button primary"
              onClick={() => setActivePage("Products")}
              type="button"
            >
              Go to products
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

function ProductTable({
  products,
  categoryById,
  formatBySlug,
  onEdit,
  onStatusChange,
}: {
  products: Product[];
  categoryById: Map<string, Category>;
  formatBySlug: Map<string, ProductFormat>;
  onEdit: (product: Product) => void;
  onStatusChange: (product: Product, status: ProductStatus) => void;
}) {
  return (
    <div className="table-scroll">
      <table className="products-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Price</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const category = product.category_id
              ? categoryById.get(product.category_id)
              : null;
            const subcategory = product.subcategory_id
              ? categoryById.get(product.subcategory_id)
              : null;
            const formatName =
              formatBySlug.get(product.product_format)?.name ??
              product.product_format;

            return (
              <tr key={product.id}>
                <td>
                  <strong>{product.name}</strong>
                  <small>/{product.slug}</small>
                  <small>
                    {category?.name ?? "Uncategorised"}
                    {subcategory ? ` / ${subcategory.name}` : ""}
                  </small>
                  <small>{formatName}</small>
                </td>
                <td>{formatPrice(Number(product.price_zar))}</td>
                <td>
                  <span className={`status-pill status-${product.status}`}>
                    {product.status}
                  </span>
                </td>
                <td>
                  <div className="table-actions">
                    <button
                      className="small-action"
                      onClick={() => onEdit(product)}
                      type="button"
                    >
                      Edit
                    </button>
                    <select
                      className="status-select"
                      aria-label={`Change status for ${product.name}`}
                      value={product.status}
                      onChange={(event) =>
                        onStatusChange(
                          product,
                          event.target.value as ProductStatus,
                        )
                      }
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
