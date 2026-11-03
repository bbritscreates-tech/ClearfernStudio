
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import "./ProductsPage.css";

type ProductStatus = "draft" | "published";

type Category = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  price: number;
  currency: string;
  cover_image_url: string | null;
  digital_file_path: string | null;
  file_name: string | null;
  file_type: string | null;
  status: ProductStatus;
  is_featured: boolean;
  includes: string[] | null;
  format: string;
  created_at: string;
};

type ProductForm = {
  name: string;
  category_id: string;
  short_description: string;
  description: string;
  price: string;
  currency: string;
  format: string;
  status: ProductStatus;
  includes: string;
  is_featured: boolean;
};

const emptyForm: ProductForm = {
  name: "",
  category_id: "",
  short_description: "",
  description: "",
  price: "",
  currency: "ZAR",
  format: "PDF",
  status: "draft",
  includes: "",
  is_featured: false,
};

const currencies = ["ZAR", "USD", "GBP", "EUR", "AUD", "CAD"];

const MAX_COVER_SIZE = 10 * 1024 * 1024;
const MAX_DOWNLOAD_SIZE = 100 * 1024 * 1024;

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function safeFileName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    return String(error.message);
  }

  return "An unexpected error occurred.";
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [downloadFile, setDownloadFile] = useState<File | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [removeDownload, setRemoveDownload] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const downloadInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [productsResult, categoriesResult] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("categories")
          .select("id, name")
          .order("name", { ascending: true }),
      ]);

      if (productsResult.error) throw productsResult.error;
      if (categoriesResult.error) throw categoriesResult.error;

      setProducts((productsResult.data ?? []) as Product[]);
      setCategories((categoriesResult.data ?? []) as Category[]);
    } catch (err) {
      setError(`Could not load products: ${errorMessage(err)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.slug.toLowerCase().includes(term) ||
        (product.short_description ?? "").toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "all" || product.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [products, search, statusFilter]);

  const publishedCount = products.filter(
    (product) => product.status === "published",
  ).length;

  const draftCount = products.filter(
    (product) => product.status === "draft",
  ).length;

  function openCreateModal() {
    setEditingProduct(null);
    setForm(emptyForm);
    setCoverFile(null);
    setDownloadFile(null);
    setRemoveCover(false);
    setRemoveDownload(false);
    setError("");
    setNotice("");

    if (coverInputRef.current) coverInputRef.current.value = "";
    if (downloadInputRef.current) downloadInputRef.current.value = "";

    setModalOpen(true);
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);

    setForm({
      name: product.name ?? "",
      category_id: product.category_id ?? "",
      short_description: product.short_description ?? "",
      description: product.description ?? "",
      price: String(product.price ?? ""),
      currency: product.currency || "ZAR",
      format: product.format || "PDF",
      status: product.status,
      includes: (product.includes ?? []).join("\n"),
      is_featured: Boolean(product.is_featured),
    });

    setCoverFile(null);
    setDownloadFile(null);
    setRemoveCover(false);
    setRemoveDownload(false);
    setError("");
    setNotice("");

    if (coverInputRef.current) coverInputRef.current.value = "";
    if (downloadInputRef.current) downloadInputRef.current.value = "";

    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingProduct(null);
    setCoverFile(null);
    setDownloadFile(null);
    setRemoveCover(false);
    setRemoveDownload(false);
  }

  function updateForm<K extends keyof ProductForm>(
    key: K,
    value: ProductForm[K],
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function uploadFile(
    file: File,
    folder: "covers" | "downloads",
  ): Promise<string> {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!user) throw new Error("Your session has expired. Please sign in again.");

    const fileName = safeFileName(file.name);

    if (!fileName) {
      throw new Error("The selected file has an invalid filename.");
    }

    const path = `${user.id}/${folder}/${crypto.randomUUID()}-${fileName}`;

    const bucket = folder === "covers" ? "product-images" : "digital-products";

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      });

    if (uploadError) throw uploadError;

    return path;
  }

  async function deleteStorageFile(
    bucket: "product-images" | "digital-products",
    path: string | null,
  ) {
    if (!path) return;

    const { error: deleteError } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (deleteError) throw deleteError;
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setNotice("");

    const name = form.name.trim();
    const price = Number(form.price);

    if (!name) {
      setError("Enter a product name.");
      return;
    }

    if (!form.price.trim() || !Number.isFinite(price) || price < 0) {
      setError("Enter a valid, non-negative price.");
      return;
    }

    if (!editingProduct && !downloadFile) {
      setError("Choose the digital product file before creating the product.");
      return;
    }

    if (coverFile && coverFile.size > MAX_COVER_SIZE) {
      setError("The cover image must be 10 MB or smaller.");
      return;
    }

    if (downloadFile && downloadFile.size > MAX_DOWNLOAD_SIZE) {
      setError("The digital product file must be 100 MB or smaller.");
      return;
    }

    if (coverFile && !coverFile.type.startsWith("image/")) {
      setError("The cover file must be an image.");
      return;
    }

    if (downloadFile && !downloadFile.type) {
      setError("The digital file type could not be identified.");
      return;
    }

    setSaving(true);

    let uploadedCoverPath: string | null = null;
    let uploadedDownloadPath: string | null = null;

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Please sign in again.");

      if (coverFile) {
        uploadedCoverPath = await uploadFile(coverFile, "covers");
      }

      if (downloadFile) {
        uploadedDownloadPath = await uploadFile(downloadFile, "downloads");
      }

      let coverImageUrl = editingProduct?.cover_image_url ?? null;
      let digitalFilePath = editingProduct?.digital_file_path ?? null;
      let fileName = editingProduct?.file_name ?? null;
      let fileType = editingProduct?.file_type ?? null;

      if (removeCover) coverImageUrl = null;

      if (uploadedCoverPath) {
        const { data } = supabase.storage
          .from("product-images")
          .getPublicUrl(uploadedCoverPath);

        coverImageUrl = data.publicUrl;
      }

      if (removeDownload) {
        digitalFilePath = null;
        fileName = null;
        fileType = null;
      }

      if (uploadedDownloadPath && downloadFile) {
        digitalFilePath = uploadedDownloadPath;
        fileName = downloadFile.name;
        fileType = downloadFile.type || null;
      }

      const payload = {
        category_id: form.category_id || null,
        name,
        slug: slugify(name),
        short_description: form.short_description.trim(),
        description: form.description.trim(),
        price,
        currency: form.currency,
        cover_image_url: coverImageUrl,
        digital_file_path: digitalFilePath,
        file_name: fileName,
        file_type: fileType,
        status: form.status,
        is_featured: form.is_featured,
        includes: form.includes
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
        format: form.format.trim() || "Digital download",
        updated_at: new Date().toISOString(),
      };

      if (!editingProduct && !digitalFilePath) {
        throw new Error("A digital file is required for a new product.");
      }

      if (editingProduct) {
        const { data, error: updateError } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingProduct.id)
          .select("id")
          .maybeSingle();

        if (updateError) throw updateError;
        if (!data) {
          throw new Error(
            "The product was not updated. Check your admin permissions and RLS policies.",
          );
        }
      } else {
        const { data, error: insertError } = await supabase
          .from("products")
          .insert(payload)
          .select("id")
          .single();

        if (insertError) throw insertError;
        if (!data) throw new Error("The product could not be created.");
      }

      // The database update succeeded. Remove replaced or unneeded files afterwards.
      if (
        editingProduct?.cover_image_url &&
        (uploadedCoverPath || removeCover)
      ) {
        const oldPath = editingProduct.cover_image_url.split(
          "/product-images/",
        )[1];

        if (oldPath) {
          try {
            await deleteStorageFile("product-images", oldPath);
          } catch (cleanupError) {
            console.warn("Old cover cleanup failed:", cleanupError);
          }
        }
      }

      if (
        editingProduct?.digital_file_path &&
        (uploadedDownloadPath || removeDownload)
      ) {
        try {
          await deleteStorageFile(
            "digital-products",
            editingProduct.digital_file_path,
          );
        } catch (cleanupError) {
          console.warn("Old download cleanup failed:", cleanupError);
        }
      }

      setNotice(editingProduct ? "Product updated successfully." : "Product created successfully.");
      setModalOpen(false);
      setEditingProduct(null);
      setCoverFile(null);
      setDownloadFile(null);

      await loadData();
    } catch (err) {
      // If the database operation failed, remove files uploaded during this attempt.
      if (uploadedCoverPath) {
        try {
          await deleteStorageFile("product-images", uploadedCoverPath);
        } catch (cleanupError) {
          console.warn("Failed to clean up uploaded cover:", cleanupError);
        }
      }

      if (uploadedDownloadPath) {
        try {
          await deleteStorageFile("digital-products", uploadedDownloadPath);
        } catch (cleanupError) {
          console.warn("Failed to clean up uploaded download:", cleanupError);
        }
      }

      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(product: Product) {
    const nextStatus: ProductStatus =
      product.status === "published" ? "draft" : "published";

    if (nextStatus === "published" && !product.digital_file_path) {
      setError(
        `Add a digital download to "${product.name}" before publishing it.`,
      );
      return;
    }

    setError("");
    setNotice("");

    const { data, error: updateError } = await supabase
      .from("products")
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id)
      .select("id")
      .maybeSingle();

    if (updateError) {
      setError(`Could not change product status: ${updateError.message}`);
      return;
    }

    if (!data) {
      setError("The status was not changed. Check your admin permissions.");
      return;
    }

    setNotice(`"${product.name}" is now ${nextStatus}.`);
    await loadData();
  }

  async function toggleFeatured(product: Product) {
    setError("");
    setNotice("");

    const { data, error: updateError } = await supabase
      .from("products")
      .update({
        is_featured: !product.is_featured,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id)
      .select("id")
      .maybeSingle();

    if (updateError) {
      setError(`Could not update featured status: ${updateError.message}`);
      return;
    }

    if (!data) {
      setError("The featured setting was not changed. Check your permissions.");
      return;
    }

    await loadData();
  }

  async function deleteProduct(product: Product) {
    const confirmed = window.confirm(
      `Delete "${product.name}" from your store? This cannot be undone.`,
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    const { data, error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id)
      .select("id")
      .maybeSingle();

    if (deleteError) {
      setError(`Could not delete product: ${deleteError.message}`);
      return;
    }

    if (!data) {
      setError("The product was not deleted. Check your admin permissions.");
      return;
    }

    // File cleanup is best-effort after the product row has been deleted.
    if (product.digital_file_path) {
      try {
        await deleteStorageFile("digital-products", product.digital_file_path);
      } catch (cleanupError) {
        console.warn("Digital file cleanup failed:", cleanupError);
      }
    }

    if (product.cover_image_url) {
      const marker = "/product-images/";
      const index = product.cover_image_url.indexOf(marker);
      const path = index >= 0
        ? product.cover_image_url.slice(index + marker.length)
        : null;

      if (path) {
        try {
          await deleteStorageFile("product-images", path);
        } catch (cleanupError) {
          console.warn("Cover cleanup failed:", cleanupError);
        }
      }
    }

    setNotice(`"${product.name}" was deleted.`);
    await loadData();
  }

  function formatPrice(product: Product) {
    try {
      return new Intl.NumberFormat("en-ZA", {
        style: "currency",
        currency: product.currency || "ZAR",
      }).format(Number(product.price));
    } catch {
      return `${product.currency} ${product.price}`;
    }
  }

  return (
    <div className="products-page">
      <header className="products-heading">
        <div>
          <p className="products-eyebrow">STORE MANAGEMENT</p>
          <h1>Products</h1>
          <p>Manage your digital products, pricing and downloadable files.</p>
        </div>

        <button
          className="products-primary-button"
          type="button"
          onClick={openCreateModal}
        >
          + Add product
        </button>
      </header>

      {notice && (
        <div className="products-alert products-alert-success" role="status">
          {notice}
          <button type="button" onClick={() => setNotice("")} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {error && !modalOpen && (
        <div className="products-alert products-alert-error" role="alert">
          {error}
          <button type="button" onClick={() => setError("")} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <section className="products-stat-grid">
        <article className="products-stat-card">
          <span>Total products</span>
          <strong>{products.length}</strong>
        </article>
        <article className="products-stat-card">
          <span>Published</span>
          <strong>{publishedCount}</strong>
        </article>
        <article className="products-stat-card">
          <span>Drafts</span>
          <strong>{draftCount}</strong>
        </article>
      </section>

      <section className="products-panel">
        <div className="products-toolbar">
          <label className="products-search">
            <span>Search products</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by product name..."
            />
          </label>

          <label className="products-status-filter">
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All products</option>
              <option value="published">Published</option>
              <option value="draft">Drafts</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="products-empty-state">Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="products-empty-state">
            <h2>{products.length === 0 ? "Your catalogue is empty" : "No products found"}</h2>
            <p>
              {products.length === 0
                ? "Add your first digital product to start building your catalogue."
                : "Try another search term or change the status filter."}
            </p>
            {products.length === 0 && (
              <button
                className="products-primary-button"
                type="button"
                onClick={openCreateModal}
              >
                Add your first product
              </button>
            )}
          </div>
        ) : (
          <div className="products-table-wrap">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Featured</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="products-product-cell">
                        {product.cover_image_url ? (
                          <img
                            src={product.cover_image_url}
                            alt=""
                            className="products-thumbnail"
                          />
                        ) : (
                          <div className="products-thumbnail products-thumbnail-placeholder">
                            PDF
                          </div>
                        )}

                        <div>
                          <strong>{product.name}</strong>
                          <span>{product.format || "Digital download"}</span>
                        </div>
                      </div>
                    </td>
                    <td>{formatPrice(product)}</td>
                    <td>
                      <span
                        className={`products-status-badge ${
                          product.status === "published"
                            ? "is-published"
                            : "is-draft"
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`products-feature-button ${
                          product.is_featured ? "is-featured" : ""
                        }`}
                        type="button"
                        onClick={() => void toggleFeatured(product)}
                        aria-label={`${
                          product.is_featured ? "Remove" : "Mark"
                        } ${product.name} as featured`}
                      >
                        {product.is_featured ? "★ Featured" : "☆ Feature"}
                      </button>
                    </td>
                    <td>
                      <div className="products-actions">
                        <button
                          type="button"
                          onClick={() => openEditModal(product)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleStatus(product)}
                        >
                          {product.status === "published" ? "Unpublish" : "Publish"}
                        </button>
                        <button
                          type="button"
                          className="products-delete-button"
                          onClick={() => void deleteProduct(product)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="products-panel-footer">
          Showing {filteredProducts.length} of {products.length} products
        </div>
      </section>

      {modalOpen && (
        <div className="products-modal-backdrop">
          <section
            className="products-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="products-modal-title"
          >
            <header className="products-modal-header">
              <div>
                <p className="products-eyebrow">
                  {editingProduct ? "UPDATE CATALOGUE" : "NEW CATALOGUE ITEM"}
                </p>
                <h2 id="products-modal-title">
                  {editingProduct ? "Edit product" : "Add product"}
                </h2>
              </div>

              <button
                className="products-modal-close"
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close"
              >
                ×
              </button>
            </header>

            {error && (
              <div className="products-alert products-alert-error" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSave}>
              <div className="products-form-grid">
                <label className="products-form-field products-field-full">
                  <span>Product name *</span>
                  <input
                    required
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    placeholder="e.g. Weekly Planner"
                  />
                </label>

                <label className="products-form-field">
                  <span>Category</span>
                  <select
                    value={form.category_id}
                    onChange={(event) => updateForm("category_id", event.target.value)}
                  >
                    <option value="">No category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="products-form-field">
                  <span>Format</span>
                  <select
                    value={form.format}
                    onChange={(event) => updateForm("format", event.target.value)}
                  >
                    <option value="PDF">PDF</option>
                    <option value="Canva template">Canva template</option>
                    <option value="Excel spreadsheet">Excel spreadsheet</option>
                    <option value="Word document">Word document</option>
                    <option value="ZIP bundle">ZIP bundle</option>
                    <option value="Digital download">Other digital download</option>
                  </select>
                </label>

                <label className="products-form-field">
                  <span>Price *</span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(event) => updateForm("price", event.target.value)}
                    placeholder="0.00"
                  />
                </label>

                <label className="products-form-field">
                  <span>Currency</span>
                  <select
                    value={form.currency}
                    onChange={(event) => updateForm("currency", event.target.value)}
                  >
                    {currencies.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="products-form-field products-field-full">
                  <span>Short description</span>
                  <input
                    value={form.short_description}
                    onChange={(event) =>
                      updateForm("short_description", event.target.value)
                    }
                    maxLength={250}
                    placeholder="A short introduction for your shop listing"
                  />
                </label>

                <label className="products-form-field products-field-full">
                  <span>Full description</span>
                  <textarea
                    rows={5}
                    value={form.description}
                    onChange={(event) =>
                      updateForm("description", event.target.value)
                    }
                    placeholder="Explain what the customer receives and how it helps."
                  />
                </label>

                <label className="products-form-field products-field-full">
                  <span>What's included (one item per line)</span>
                  <textarea
                    rows={4}
                    value={form.includes}
                    onChange={(event) => updateForm("includes", event.target.value)}
                    placeholder={"Printable PDF\nA4 page size\nUndated layout"}
                  />
                </label>

                <label className="products-form-field products-field-full">
                  <span>Cover image (maximum 10 MB)</span>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      setCoverFile(event.target.files?.[0] ?? null);
                      setRemoveCover(false);
                    }}
                  />
                  {editingProduct?.cover_image_url && !removeCover && (
                    <span className="products-file-note">
                      An existing cover is saved.
                      <button
                        type="button"
                        className="products-inline-button"
                        onClick={() => {
                          setRemoveCover(true);
                          setCoverFile(null);
                          if (coverInputRef.current) coverInputRef.current.value = "";
                        }}
                      >
                        Remove cover
                      </button>
                    </span>
                  )}
                  {removeCover && (
                    <span className="products-file-note">
                      The existing cover will be removed.
                      <button
                        type="button"
                        className="products-inline-button"
                        onClick={() => setRemoveCover(false)}
                      >
                        Undo
                      </button>
                    </span>
                  )}
                </label>

                <label className="products-form-field products-field-full">
                  <span>
                    Digital download (maximum 100 MB)
                    {!editingProduct && " *"}
                  </span>
                  <input
                    ref={downloadInputRef}
                    type="file"
                    onChange={(event) => {
                      setDownloadFile(event.target.files?.[0] ?? null);
                      setRemoveDownload(false);
                    }}
                  />
                  {editingProduct?.file_name && !removeDownload && (
                    <span className="products-file-note">
                      Current file: {editingProduct.file_name}
                      <button
                        type="button"
                        className="products-inline-button"
                        onClick={() => {
                          setRemoveDownload(true);
                          setDownloadFile(null);
                          if (downloadInputRef.current) {
                            downloadInputRef.current.value = "";
                          }
                        }}
                      >
                        Remove file
                      </button>
                    </span>
                  )}
                  {removeDownload && (
                    <span className="products-file-note">
                      The existing download will be removed.
                      <button
                        type="button"
                        className="products-inline-button"
                        onClick={() => setRemoveDownload(false)}
                      >
                        Undo
                      </button>
                    </span>
                  )}
                  <span className="products-help-text">
                    Files are stored in your private digital-products bucket.
                    This form does not make download links public.
                  </span>
                </label>

                <label className="products-form-field">
                  <span>Visibility</span>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateForm("status", event.target.value as ProductStatus)
                    }
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </label>

                <label className="products-checkbox-field">
                  <input
                    type="checkbox"
                    checked={form.is_featured}
                    onChange={(event) =>
                      updateForm("is_featured", event.target.checked)
                    }
                  />
                  <span>Feature this product in the shop</span>
                </label>
              </div>

              <footer className="products-modal-footer">
                <button
                  className="products-secondary-button"
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  className="products-primary-button"
                  type="submit"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingProduct
                      ? "Save changes"
                      : "Create product"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
