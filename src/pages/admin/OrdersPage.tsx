
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import "./OrdersPage.css";

type Order = {
  id: string;
  order_number: string;
  customer_email: string;
  currency: string;
  subtotal: number | string;
  total: number | string;
  status: string;
  created_at: string;
  updated_at: string;
};

type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number | string;
  line_total: number | string;
};

type Payment = {
  id: string;
  order_id: string | null;
  provider: string;
  provider_reference: string | null;
  amount: number | string;
  currency: string;
  status: string;
  verified_at: string | null;
  created_at: string;
};

type OrderStatus = "all" | "pending" | "paid" | "cancelled" | "refunded";

function money(value: number | string, currency: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "—";

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "ZAR",
    }).format(amount);
  } catch {
    return `${currency || "ZAR"} ${amount.toFixed(2)}`;
  }
}

function dateTime(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusClass(status: string) {
  const safeStatus = status.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return `orders-status orders-status-${safeStatus || "unknown"}`;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus>("all");
  const [search, setSearch] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const [
        { data: orderData, error: orderError },
        { data: itemData, error: itemError },
        { data: paymentData, error: paymentError },
      ] = await Promise.all([
        supabase
          .from("orders")
          .select(
            "id, order_number, customer_email, currency, subtotal, total, status, created_at, updated_at",
          )
          .order("created_at", { ascending: false }),

        supabase
          .from("order_items")
          .select(
            "id, order_id, product_id, product_name, quantity, unit_price, line_total",
          ),

        supabase
          .from("payment_transactions")
          .select(
            "id, order_id, provider, provider_reference, amount, currency, status, verified_at, created_at",
          )
          .order("created_at", { ascending: false }),
      ]);

      if (orderError) throw orderError;
      if (itemError) throw itemError;
      if (paymentError) throw paymentError;

      setOrders((orderData ?? []) as Order[]);
      setItems((itemData ?? []) as OrderItem[]);
      setPayments((paymentData ?? []) as Payment[]);
    } catch (loadError) {
      console.error("Unable to load orders:", loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load orders. Check your connection and database permissions.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "all" ||
        order.status.toLowerCase() === statusFilter;

      const matchesSearch =
        !term ||
        order.order_number.toLowerCase().includes(term) ||
        order.customer_email.toLowerCase().includes(term) ||
        order.id.toLowerCase().includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [orders, search, statusFilter]);

  const orderItemsByOrder = useMemo(() => {
    const result = new Map<string, OrderItem[]>();

    for (const item of items) {
      const existing = result.get(item.order_id) ?? [];
      existing.push(item);
      result.set(item.order_id, existing);
    }

    return result;
  }, [items]);

  const paymentsByOrder = useMemo(() => {
    const result = new Map<string, Payment[]>();

    for (const payment of payments) {
      if (!payment.order_id) continue;

      const existing = result.get(payment.order_id) ?? [];
      existing.push(payment);
      result.set(payment.order_id, existing);
    }

    return result;
  }, [payments]);

  const counts = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter(
        (order) => order.status.toLowerCase() === "pending",
      ).length,
      paid: orders.filter(
        (order) => order.status.toLowerCase() === "paid",
      ).length,
      cancelled: orders.filter(
        (order) => order.status.toLowerCase() === "cancelled",
      ).length,
    };
  }, [orders]);

  const paidTotals = useMemo(() => {
    const totals = new Map<string, number>();

    for (const order of orders) {
      if (order.status.toLowerCase() !== "paid") continue;

      const currency = order.currency || "ZAR";
      totals.set(
        currency,
        (totals.get(currency) ?? 0) + Number(order.total || 0),
      );
    }

    return Array.from(totals.entries());
  }, [orders]);

  return (
    <div className="admin-orders">
      <header className="orders-heading">
        <div>
          <p className="admin-eyebrow">STORE MANAGEMENT</p>
          <h1>Orders</h1>
          <p className="admin-muted">
            Review customer purchases, order items and recorded payment
            transactions.
          </p>
        </div>

        <button
          type="button"
          className="orders-refresh-button"
          onClick={() => void loadOrders(true)}
          disabled={loading || refreshing}
        >
          {refreshing ? "Refreshing…" : "Refresh orders"}
        </button>
      </header>

      {error && (
        <div className="orders-alert" role="alert">
          <strong>Could not load order information.</strong>
          <p>{error}</p>
          <p>
            If Supabase reports a permission error, we will need to check the
            row-level security policies for the three order tables.
          </p>
        </div>
      )}

      <section className="orders-summary-grid" aria-label="Order summary">
        <article className="orders-summary-card">
          <span>Total orders</span>
          <strong>{loading ? "—" : counts.total}</strong>
        </article>
        <article className="orders-summary-card">
          <span>Pending orders</span>
          <strong>{loading ? "—" : counts.pending}</strong>
        </article>
        <article className="orders-summary-card">
          <span>Paid orders</span>
          <strong>{loading ? "—" : counts.paid}</strong>
        </article>
        <article className="orders-summary-card">
          <span>Cancelled orders</span>
          <strong>{loading ? "—" : counts.cancelled}</strong>
        </article>
      </section>

      <section className="orders-paid-summary">
        <div>
          <h2>Recorded paid-order totals</h2>
          <p>
            Based on orders currently marked as paid. These figures are not
            independently reconciled against a payment provider.
          </p>
        </div>

        {paidTotals.length === 0 ? (
          <strong>No paid orders recorded</strong>
        ) : (
          <div className="orders-currency-totals">
            {paidTotals.map(([currency, total]) => (
              <span key={currency}>
                {money(total, currency)}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="orders-list-panel">
        <div className="orders-list-heading">
          <div>
            <h2>All orders</h2>
            <p>
              {loading
                ? "Loading orders…"
                : `${filteredOrders.length} of ${orders.length} orders`}
            </p>
          </div>
        </div>

        <div className="orders-filters">
          <label className="orders-search">
            <span>Search orders</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Order number, email or ID"
            />
          </label>

          <label className="orders-status-filter">
            <span>Order status</span>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as OrderStatus)
              }
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="orders-empty-state">Loading orders…</div>
        ) : filteredOrders.length === 0 ? (
          <div className="orders-empty-state">
            <h3>No orders found</h3>
            <p>
              Orders will appear here when they exist in your database and
              your administrator account has permission to read them.
            </p>
          </div>
        ) : (
          <div className="orders-table-wrap">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const isExpanded = expandedOrder === order.id;
                  const orderItems =
                    orderItemsByOrder.get(order.id) ?? [];
                  const orderPayments =
                    paymentsByOrder.get(order.id) ?? [];

                  return (
                    <>
                      <tr key={order.id} className="orders-main-row">
                        <td>
                          <strong>{order.order_number}</strong>
                          <small>{order.id}</small>
                        </td>
                        <td>{order.customer_email}</td>
                        <td>{dateTime(order.created_at)}</td>
                        <td className="orders-total-cell">
                          {money(order.total, order.currency)}
                        </td>
                        <td>
                          <span className={statusClass(order.status)}>
                            {order.status}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="orders-detail-button"
                            aria-expanded={isExpanded}
                            onClick={() =>
                              setExpandedOrder(
                                isExpanded ? null : order.id,
                              )
                            }
                          >
                            {isExpanded ? "Hide details" : "View details"}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr key={`${order.id}-details`}>
                          <td colSpan={6} className="orders-detail-cell">
                            <div className="orders-detail-panel">
                              <div className="orders-detail-columns">
                                <section>
                                  <h3>Order information</h3>
                                  <dl>
                                    <dt>Order number</dt>
                                    <dd>{order.order_number}</dd>
                                    <dt>Customer email</dt>
                                    <dd>{order.customer_email}</dd>
                                    <dt>Created</dt>
                                    <dd>{dateTime(order.created_at)}</dd>
                                    <dt>Last updated</dt>
                                    <dd>{dateTime(order.updated_at)}</dd>
                                    <dt>Subtotal</dt>
                                    <dd>
                                      {money(order.subtotal, order.currency)}
                                    </dd>
                                    <dt>Order total</dt>
                                    <dd>
                                      {money(order.total, order.currency)}
                                    </dd>
                                  </dl>
                                </section>

                                <section>
                                  <h3>Purchased products</h3>
                                  {orderItems.length === 0 ? (
                                    <p>No order items were found.</p>
                                  ) : (
                                    <div className="orders-detail-table-wrap">
                                      <table className="orders-detail-table">
                                        <thead>
                                          <tr>
                                            <th>Product</th>
                                            <th>Qty</th>
                                            <th>Unit price</th>
                                            <th>Line total</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {orderItems.map((item) => (
                                            <tr key={item.id}>
                                              <td>{item.product_name}</td>
                                              <td>{item.quantity}</td>
                                              <td>
                                                {money(
                                                  item.unit_price,
                                                  order.currency,
                                                )}
                                              </td>
                                              <td>
                                                {money(
                                                  item.line_total,
                                                  order.currency,
                                                )}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </section>
                              </div>

                              <section className="orders-payment-section">
                                <h3>Payment transactions</h3>
                                {orderPayments.length === 0 ? (
                                  <p>
                                    No payment transactions are recorded for
                                    this order.
                                  </p>
                                ) : (
                                  <div className="orders-detail-table-wrap">
                                    <table className="orders-detail-table">
                                      <thead>
                                        <tr>
                                          <th>Provider</th>
                                          <th>Reference</th>
                                          <th>Amount</th>
                                          <th>Status</th>
                                          <th>Verified at</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {orderPayments.map((payment) => (
                                          <tr key={payment.id}>
                                            <td>{payment.provider}</td>
                                            <td>
                                              {payment.provider_reference ||
                                                "—"}
                                            </td>
                                            <td>
                                              {money(
                                                payment.amount,
                                                payment.currency,
                                              )}
                                            </td>
                                            <td>
                                              <span
                                                className={statusClass(
                                                  payment.status,
                                                )}
                                              >
                                                {payment.status}
                                              </span>
                                            </td>
                                            <td>
                                              {dateTime(payment.verified_at)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </section>

                              <p className="orders-readonly-note">
                                This page is read-only. Payment status and
                                download access must be updated only through
                                verified payment-processing logic.
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
