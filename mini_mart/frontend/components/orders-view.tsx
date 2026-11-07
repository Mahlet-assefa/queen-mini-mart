import { Download, Plus, Trash2 } from 'lucide-react';
import { Order, Product } from '@/lib/inventory';

export default function OrdersView({
  orders,
  low,
  onNew,
  onLow,
  onChoose,
  onExport,
  onClear,
  onHistory,
  clearing,
}: {
  orders: Order[];
  low: Product[];
  onNew: () => void;
  onLow: () => void;
  onChoose: () => void;
  onExport: () => void;
  onClear: () => void;
  onHistory: () => void;
  clearing: boolean;
}) {
  return (
    <>
      <div className="page-heading orders-heading">
        <div>
          <p className="eyebrow">Supplier purchasing</p>
          <h1>Orders</h1>
        </div>
        <div className="order-heading-actions">
          <button className="primary-button" onClick={onNew}>
            <Plus size={17} /> New order
          </button>
          <button className="danger-button" onClick={onClear} disabled={!orders.length || clearing}>
            <Trash2 size={16} /> {clearing ? 'Clearing…' : 'Clear orders'}
          </button>
        </div>
      </div>
      <div className="order-actions">
        <button className="secondary-button" onClick={onLow} disabled={!low.length}>
          <Plus size={16} /> Add low stock
        </button>
        <button className="secondary-button" onClick={onChoose}>
          <Plus size={16} /> Choose products
        </button>
        <button className="secondary-button" onClick={onExport}>
          <Download size={16} /> Export CSV
        </button>
      </div>
      <section className="card table-scroll">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Date</th>
              <th>Items</th>
              <th>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>
                  <strong>#{order.id.slice(0, 8)}</strong>
                </td>
                <td>{order.date.slice(0, 10)}</td>
                <td>
                  {order.items.map((item) => `${item.productName} × ${item.quantity}`).join(', ')}
                </td>
                <td>{order.totalItems}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!orders.length && (
          <div className="empty">No orders yet. Create one to track supplier requests.</div>
        )}
      </section>
      <div className="order-history-action">
        <button className="secondary-button" onClick={onHistory}>
          View order details
        </button>
      </div>
    </>
  );
}
