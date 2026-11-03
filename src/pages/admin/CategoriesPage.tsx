
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import "./CategoriesPage.css";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

type CategoryForm = {
  name: string;
  description: string;
  is_active: boolean;
  sort_order: string;
};

const emptyForm: CategoryForm = {
  name: "",
  description: "",
  is_active: true,
  sort_order: "0",
};

function createSlug(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getErrorMessage(error: unknown) {
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

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data, error: queryError } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (queryError) throw queryError;

      setCategories((data ?? []) as Category[]);
    } catch (err) {
      setError(`Could not load categories: ${getErrorMessage(err)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const filteredCategories = categories.filter((category) => {
    const term = search.trim().toLowerCase();

    return (
      !term ||
      category.name.toLowerCase().includes(term) ||
      category.slug.toLowerCase().includes(term) ||
      (category.description ?? "").toLowerCase().includes(term)
    );
  });

  function updateForm<K extends keyof CategoryForm>(
    key: K,
    value: CategoryForm[K],
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function openCreateModal() {
    setEditingCategory(null);
    setForm({
      ...emptyForm,
      sort_order: String(categories.length),
    });
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function openEditModal(category: Category) {
    setEditingCategory(category);
    setForm({
      name: category.name,
      description: category.description ?? "",
      is_active: category.is_active,
      sort_order: String(category.sort_order ?? 0),
    });
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingCategory(null);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const name = form.name.trim();
    const slug = createSlug(name);
    const sortOrder = Number(form.sort_order);

    if (!name || !slug) {
      setError("Enter a valid category name.");
      return;
    }

    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      setError("Display order must be a whole number of zero or higher.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name,
        slug,
        description: form.description.trim() || null,
        is_active: form.is_active,
        sort_order: sortOrder,
        updated_at: new Date().toISOString(),
      };

      if (editingCategory) {
        const { data, error: updateError } = await supabase
          .from("categories")
          .update(payload)
          .eq("id", editingCategory.id)
          .select("id")
          .maybeSingle();

        if (updateError) throw updateError;

        if (!data) {
          throw new Error(
            "The category was not updated. Check your administrator permissions.",
          );
        }
      } else {
        const { data, error: insertError } = await supabase
          .from("categories")
          .insert(payload)
          .select("id")
          .single();

        if (insertError) throw insertError;
        if (!data) throw new Error("The category could not be created.");
      }

      setModalOpen(false);
      setEditingCategory(null);
      setNotice(
        editingCategory
          ? "Category updated successfully."
          : "Category created successfully.",
      );

      await loadCategories();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(category: Category) {
    setError("");
    setNotice("");

    const { data, error: updateError } = await supabase
      .from("categories")
      .update({
        is_active: !category.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", category.id)
      .select("id")
      .maybeSingle();

    if (updateError) {
      setError(`Could not change category status: ${updateError.message}`);
      return;
    }

    if (!data) {
      setError("The category status was not changed. Check your permissions.");
      return;
    }

    setNotice(
      `"${category.name}" is now ${category.is_active ? "inactive" : "active"}.`,
    );

    await loadCategories();
  }

  async function deleteCategory(category: Category) {
    const confirmed = window.confirm(
      `Delete the category "${category.name}"? Products assigned to this category may prevent deletion.`,
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    const { data, error: deleteError } = await supabase
      .from("categories")
      .delete()
      .eq("id", category.id)
      .select("id")
      .maybeSingle();

    if (deleteError) {
      setError(
        `Could not delete category: ${deleteError.message}. If products use this category, edit those products first.`,
      );
      return;
    }

    if (!data) {
      setError("The category was not deleted. Check your permissions.");
      return;
    }

    setNotice(`"${category.name}" was deleted.`);
    await loadCategories();
  }

  return (
    <div className="categories-page">
      <header className="categories-heading">
        <div>
          <p className="categories-eyebrow">STORE MANAGEMENT</p>
          <h1>Categories</h1>
          <p>Organise your digital products so customers can browse your shop.</p>
        </div>

        <button
          type="button"
          className="categories-primary-button"
          onClick={openCreateModal}
        >
          + Add category
        </button>
      </header>

      {notice && (
        <div className="categories-alert categories-alert-success" role="status">
          {notice}
          <button type="button" onClick={() => setNotice("")} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {error && !modalOpen && (
        <div className="categories-alert categories-alert-error" role="alert">
          {error}
          <button type="button" onClick={() => setError("")} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <section className="categories-stats">
        <article className="categories-stat-card">
          <span>Total categories</span>
          <strong>{categories.length}</strong>
        </article>
        <article className="categories-stat-card">
          <span>Active</span>
          <strong>{categories.filter((category) => category.is_active).length}</strong>
        </article>
        <article className="categories-stat-card">
          <span>Inactive</span>
          <strong>{categories.filter((category) => !category.is_active).length}</strong>
        </article>
      </section>

      <section className="categories-panel">
        <div className="categories-toolbar">
          <label>
            <span>Search categories</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or description..."
            />
          </label>
        </div>

        {loading ? (
          <div className="categories-empty">Loading categories...</div>
        ) : filteredCategories.length === 0 ? (
          <div className="categories-empty">
            <h2>{categories.length ? "No categories found" : "No categories yet"}</h2>
            <p>
              {categories.length
                ? "Try a different search term."
                : "Create categories to organise your digital products."}
            </p>
            {categories.length === 0 && (
              <button
                type="button"
                className="categories-primary-button"
                onClick={openCreateModal}
              >
                Create your first category
              </button>
            )}
          </div>
        ) : (
          <div className="categories-table-wrap">
            <table className="categories-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Slug</th>
                  <th>Display order</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((category) => (
                  <tr key={category.id}>
                    <td>
                      <strong>{category.name}</strong>
                      {category.description && (
                        <span className="categories-description">
                          {category.description}
                        </span>
                      )}
                    </td>
                    <td>
                      <code>{category.slug}</code>
                    </td>
                    <td>{category.sort_order}</td>
                    <td>
                      <span
                        className={`categories-status ${
                          category.is_active ? "is-active" : "is-inactive"
                        }`}
                      >
                        {category.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="categories-actions">
                        <button
                          type="button"
                          onClick={() => openEditModal(category)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleActive(category)}
                        >
                          {category.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          className="categories-delete"
                          onClick={() => void deleteCategory(category)}
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

        <footer className="categories-footer">
          Showing {filteredCategories.length} of {categories.length} categories
        </footer>
      </section>

      {modalOpen && (
        <div className="categories-backdrop">
          <section
            className="categories-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-modal-title"
          >
            <header className="categories-modal-heading">
              <div>
                <p className="categories-eyebrow">
                  {editingCategory ? "UPDATE CATEGORY" : "NEW CATEGORY"}
                </p>
                <h2 id="category-modal-title">
                  {editingCategory ? "Edit category" : "Add category"}
                </h2>
              </div>
              <button
                type="button"
                className="categories-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close"
              >
                ×
              </button>
            </header>

            {error && (
              <div className="categories-alert categories-alert-error" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSave}>
              <label className="categories-field">
                <span>Category name *</span>
                <input
                  required
                  autoFocus
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  placeholder="e.g. Planners"
                />
                <small>
                  URL slug: {createSlug(form.name) || "category-name"}
                </small>
              </label>

              <label className="categories-field">
                <span>Description</span>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(event) =>
                    updateForm("description", event.target.value)
                  }
                  placeholder="Describe the products in this category."
                />
              </label>

              <label className="categories-field">
                <span>Display order</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={form.sort_order}
                  onChange={(event) =>
                    updateForm("sort_order", event.target.value)
                  }
                />
                <small>Lower numbers appear first when sorting by display order.</small>
              </label>

              <label className="categories-checkbox">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    updateForm("is_active", event.target.checked)
                  }
                />
                <span>Active — available for use in the shop</span>
              </label>

              <footer className="categories-modal-footer">
                <button
                  type="button"
                  className="categories-secondary-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="categories-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingCategory
                      ? "Save changes"
                      : "Create category"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
