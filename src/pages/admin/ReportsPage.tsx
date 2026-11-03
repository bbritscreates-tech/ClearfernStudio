
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import "./ReportsPage.css";

type Order = {
  id: string;
  order_number: string;
  customer_email: string;
  currency: string;
  subtotal: number | string;
  total: number | string;
  status: string;
  created_at: string;
};

type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  line_total: number | string;
};

type Period = "7" | "30" | "90" | "all";

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "ZAR",
    }).format(value);
  } catch {
    return `${currency || "ZAR"} ${value.toFixed(2)}`;
  }
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getStartDate(period: Period): Date | null {
  if (period === "all") return null;

  const date = new Date();
  date.setDate(date.getDate() - Number(period));
  return date;
}

export default function ReportsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [period, setPeriod] = useState<Period>("30");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadReportData = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const [
        { data: orderData, error: orderError },
        { data: itemData, error: itemError },
      ] = await Promise.all([
        supabase
          .from("orders")
          .select(
            "id, order_number, customer_email, currency, subtotal, total, status, created_at",
          )
          .order("created_at", { ascending: false }),

        supabase
          .from("order_items")
          .select("id, order_id, product_id, product_name, quantity, line_total"),
      ]);

      if (orderError) throw orderError;
      if (itemError) throw itemError;

      setOrders((orderData ?? []) as Order[]);
      setItems((itemData ?? []) as OrderItem[]);
    } catch (reportError) {
      console.error("Unable to load reports:", reportError);
      setError(
        reportError instanceof Error
          ? reportError.message
          : "Unable to load report data.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadReportData();
  }, [loadReportData]);

  const filteredOrders = useMemo(() => {
    const startDate = getStartDate(period);

    if (!startDate) return orders;

    return orders.filter(
      (order) => new Date(order.created_at).getTime() >= startDate.getTime(),
    );
  }, [orders, period]);

  const metrics = useMemo(() => {
    const paid = filteredOrders.filter(
      (order) => order.status.toLowerCase() === "paid",
    );

    const pending = filteredOrders.filter(
      (order) => order.status.toLowerCase() === "pending",
    );

    const cancelled = filteredOrders.filter((order) =>
      ["cancelled", "canceled"].includes(order.status.toLowerCase()),
    );

    const revenueByCurrency = new Map<string, number>();

    for (const order of paid) {
      const currency = order.currency || "ZAR";
      revenueByCurrency.set(
        currency,
        (revenueByCurrency.get(currency) ?? 0) + Number(order.total || 0),
      );
    }

    const itemsByOrder = new Map<string, OrderItem[]>();

    for (const item of items) {
      const existing = itemsByOrder.get(item.order_id) ?? [];
      existing.push(item);
      itemsByOrder.set(item.order_id, existing);
    }

    const soldByProduct = new Map<
      string,
      { name: string; quantity: number; revenue: number }
    >();

    for (const order of paid) {
      const orderItems = itemsByOrder.get(order.id) ?? [];

      for (const item of orderItems) {
        const key = item.product_id || item.product_name;
        const existing = soldByProduct.get(key) ?? {
          name: item.product_name,
          quantity: 0,
          revenue: 0,
        };

        existing.quantity += Number(item.quantity || 0);
        existing.revenue += Number(item.line_total || 0);
        soldByProduct.set(key, existing);
      }
    }

    const topProducts = Array.from(soldByProduct.values()).sort(
      (a, b) => b.quantity - a.quantity,
    );

    return {
      total: filteredOrders.length,
      paidCount: paid.length,
      pendingCount: pending.length,
      cancelledCount: cancelled.length,
      revenueByCurrency: Array.from(revenueByCurrency.entries()),
      topProducts,
    };
  }, [filteredOrders, items]);

  const recentOrders = filteredOrders.slice(0, 8);

  return (
    <div className="admin-reports">
      <header className="reports-heading">
        <div>
          <p className="admin-eyebrow">STORE PERFORMANCE</p>
          <h1>Reports</h1>
          <p className="admin-muted">
            Understand your recorded orders, revenue and product sales.
          </p>
        </div>

        <button
          type="button"
          className="reports-refresh-button"
          onClick={() => void loadReportData(true)}
          disabled={loading || refreshing}
        >
          {refreshing ? "Refreshing…" : "Refresh reports"}
        </button>
      </header>

      <section className="reports-filter-panel">
        <label htmlFor="reports-period">Reporting period</label>
        <select
          id="reports-period"
          value={period}
          onChange={(event) => setPeriod(event.target.value as Period)}
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="all">All recorded time</option>
        </select>
        <span>
          {loading
            ? "Loading report data…"
            : `${filteredOrders.length} orders in this period`}
        </span>
      </section>

      {error && (
        <div className="reports-alert" role="alert">
          <strong>Unable to load reports.</strong>
          <p>{error}</p>
        </div>
      )}

      <section className="reports-metrics-grid">
        <article className="reports-metric-card">
          <span>Total orders</span>
          <strong>{loading ? "—" : metrics.total}</strong>
          <small>Orders created during the selected period</small>
        </article>

        <article className="reports-metric-card">
          <span>Paid orders</span>
          <strong>{loading ? "—" : metrics.paidCount}</strong>
          <small>Orders currently marked as paid</small>
        </article>

        <article className="reports-metric-card">
          <span>Pending orders</span>
          <strong>{loading ? "—" : metrics.pendingCount}</strong>
          <small>Orders awaiting completion</small>
        </article>

        <article className="reports-metric-card">
          <span>Cancelled orders</span>
          <strong>{loading ? "—" : metrics.cancelledCount}</strong>
          <small>Orders marked as cancelled</small>
        </article>
      </section>

      <section className="reports-panel reports-revenue-panel">
        <div>
          <p className="admin-eyebrow">RECORDED REVENUE</p>
          <h2>Paid-order totals</h2>
          <p>
            Based on the total of orders currently marked paid. Amounts remain
            separated by currency and are not independently reconciled with a
            payment provider.
          </p>
        </div>

        {loading ? (
          <span>Loading…</span>
        ) : metrics.revenueByCurrency.length === 0 ? (
          <div className="reports-no-data">
            No paid-order revenue recorded for this period.
          </div>
        ) : (
          <div className="reports-revenue-values">
            {metrics.revenueByCurrency.map(([currency, total]) => (
              <div key={currency}>
                <span>{currency}</span>
                <strong>{money(total, currency)}</strong>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="reports-panel">
        <div className="reports-panel-heading">
          <div>
            <h2>Best-selling products</h2>
            <p>Ranked by quantity recorded on paid orders.</p>
          </div>
        </div>

        {loading ? (
          <div className="reports-no-data">Loading product sales…</div>
        ) : metrics.topProducts.length === 0 ? (
          <div className="reports-no-data">
            No product sales are recorded on paid orders for this period.
          </div>
        ) : (
          <div className="reports-table-wrap">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Units sold</th>
                  <th>Recorded line totals</th>
                </tr>
              </thead>
              <tbody>
                {metrics.topProducts.map((product) => (
                  <tr key={product.name}>
                    <td>{product.name}</td>
                    <td>{product.quantity}</td>
                    <td>
                      {product.revenue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="reports-table-note">
              Product line totals are shown as numeric values because the
              current order-item schema does not store a currency per item.
              The figures should not be combined across different currencies.
            </p>
          </div>
        )}
      </section>

      <section className="reports-panel">
        <div className="reports-panel-heading">
          <div>
            <h2>Recent orders</h2>
            <p>Latest orders in the selected reporting period.</p>
          </div>
        </div>

        {loading ? (
          <div className="reports-no-data">Loading recent orders…</div>
        ) : recentOrders.length === 0 ? (
          <div className="reports-no-data">
            No orders were found in this period.
          </div>
        ) : (
          <div className="reports-table-wrap">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.order_number}</td>
                    <td>{order.customer_email}</td>
                    <td>{formatDate(order.created_at)}</td>
                    <td>{money(Number(order.total), order.currency)}</td>
                    <td>
                      <span
                        className={`reports-status reports-status-${order.status
                          .toLowerCase()
                          .replace(/[^a-z0-9_-]/g, "")}`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="reports-disclaimer">
        Reports use the information currently recorded in Supabase. Refunds,
        provider fees, chargebacks and verified payment reconciliation are not
        calculated by this page.
      </p>
    </div>
  );
}
