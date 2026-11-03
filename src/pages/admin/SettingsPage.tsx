
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import "./SettingsPage.css";

type StoreSettings = {
  store_name: string;
  support_email: string;
  support_whatsapp: string;
  default_currency: string;
  delivery_message: string;
};

const defaultSettings: StoreSettings = {
  store_name: "Clearfern Studio",
  support_email: "",
  support_whatsapp: "",
  default_currency: "ZAR",
  delivery_message:
    "Your digital download will be available after your payment has been confirmed.",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("store_settings")
        .select(
          "store_name, support_email, support_whatsapp, default_currency, delivery_message",
        )
        .eq("id", true)
        .maybeSingle();

      if (error) {
        setErrorMessage(
          `Could not load settings: ${error.message}. Check that you ran the store_settings SQL in Supabase.`,
        );
      } else if (data) {
        setSettings({
          store_name: data.store_name ?? defaultSettings.store_name,
          support_email: data.support_email ?? "",
          support_whatsapp: data.support_whatsapp ?? "",
          default_currency: data.default_currency ?? "ZAR",
          delivery_message:
            data.delivery_message ?? defaultSettings.delivery_message,
        });
      }

      setLoading(false);
    }

    void loadSettings();
  }, []);

  function updateSetting(
    field: keyof StoreSettings,
    value: string,
  ) {
    setSettings((current) => ({ ...current, [field]: value }));
    setSuccessMessage("");
    setErrorMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase.from("store_settings").upsert(
      {
        id: true,
        ...settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (error) {
      setErrorMessage(`Could not save settings: ${error.message}`);
    } else {
      setSuccessMessage("Your store settings have been saved.");
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <section className="settings-page">
        <div className="settings-loading">Loading store settings…</div>
      </section>
    );
  }

  return (
    <section className="settings-page">
      <div className="settings-page-header">
        <div>
          <p className="settings-eyebrow">STORE CONFIGURATION</p>
          <h1>Settings</h1>
          <p className="settings-page-description">
            Manage your store information and customer-facing details.
          </p>
        </div>
        <span className="settings-status">
          <span className="settings-status-dot" />
          Admin settings
        </span>
      </div>

      {errorMessage && (
        <div className="settings-alert settings-alert-error" role="alert">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="settings-alert settings-alert-success" role="status">
          {successMessage}
        </div>
      )}

      <form className="settings-form" onSubmit={handleSubmit}>
        <div className="settings-card">
          <div className="settings-card-heading">
            <span className="settings-card-icon" aria-hidden="true">⌂</span>
            <div>
              <h2>Store information</h2>
              <p>Basic information about your online store.</p>
            </div>
          </div>

          <div className="settings-field">
            <label htmlFor="store-name">Store name</label>
            <input
              id="store-name"
              type="text"
              value={settings.store_name}
              onChange={(event) =>
                updateSetting("store_name", event.target.value)
              }
              required
              maxLength={100}
            />
            <small>The name used to identify your store.</small>
          </div>

          <div className="settings-field">
            <label htmlFor="default-currency">Default currency</label>
            <select
              id="default-currency"
              value={settings.default_currency}
              onChange={(event) =>
                updateSetting("default_currency", event.target.value)
              }
              required
            >
              <option value="ZAR">ZAR — South African rand</option>
              <option value="USD">USD — US dollar</option>
              <option value="GBP">GBP — British pound</option>
              <option value="EUR">EUR — Euro</option>
            </select>
            <small>
              This saves your preferred default currency. It does not
              automatically convert existing product prices or configure
              payment processing.
            </small>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-heading">
            <span className="settings-card-icon" aria-hidden="true">✉</span>
            <div>
              <h2>Customer support</h2>
              <p>Contact details customers can use to reach you.</p>
            </div>
          </div>

          <div className="settings-field">
            <label htmlFor="support-email">Support email</label>
            <input
              id="support-email"
              type="email"
              value={settings.support_email}
              onChange={(event) =>
                updateSetting("support_email", event.target.value)
              }
              placeholder="support@example.com"
              maxLength={254}
            />
            <small>
              Leave blank until you have chosen the email address you want
              customers to use.
            </small>
          </div>

          <div className="settings-field">
            <label htmlFor="support-whatsapp">WhatsApp contact number</label>
            <input
              id="support-whatsapp"
              type="tel"
              value={settings.support_whatsapp}
              onChange={(event) =>
                updateSetting("support_whatsapp", event.target.value)
              }
              placeholder="+27..."
              maxLength={30}
            />
            <small>
              Include the country code if you want to use an international
              format.
            </small>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-card-heading">
            <span className="settings-card-icon" aria-hidden="true">↓</span>
            <div>
              <h2>Digital delivery</h2>
              <p>Set the message customers will see about digital downloads.</p>
            </div>
          </div>

          <div className="settings-field">
            <label htmlFor="delivery-message">Delivery message</label>
            <textarea
              id="delivery-message"
              value={settings.delivery_message}
              onChange={(event) =>
                updateSetting("delivery_message", event.target.value)
              }
              rows={4}
              required
              maxLength={1000}
            />
            <small>
              This saves the message only. Secure download links and automated
              delivery will be implemented separately.
            </small>
          </div>

          <div className="settings-info-note">
            <strong>Payment and security</strong>
            <p>
              Yoco integration is not configured here. Secret keys must remain
              in server-side environment variables or secure server secrets,
              never in this page or browser code.
            </p>
          </div>
        </div>

        <div className="settings-form-footer">
          <p>Remember to save your changes before leaving this page.</p>
          <button
            className="settings-save-button"
            type="submit"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>
    </section>
  );
}
