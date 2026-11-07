import { FinanceRow, money, Transaction, dateKey, User } from '@/lib/inventory';

type Period = 'day' | 'week' | 'month' | 'year';
const periods: { id: Period; label: string }[] = [
  { id: 'day', label: 'Daily' },
  { id: 'week', label: 'Weekly' },
  { id: 'month', label: 'Monthly' },
  { id: 'year', label: 'Yearly' },
];

export default function FinanceView({
  role,
  period,
  setPeriod,
  rows,
  sales,
}: {
  role: User['role'];
  period: Period;
  setPeriod: (period: Period) => void;
  rows: FinanceRow[];
  sales: Transaction[];
}) {
  const dailySales = sales.filter((item) => dateKey(item.date) === dateKey(new Date()));
  if (role === 'sales') {
    return (
      <div className="cash-card card">
        <span>Cash collected today</span>
        <strong>
          {money(dailySales.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0))}
        </strong>
        <small>From {dailySales.length} sale entries today</small>
      </div>
    );
  }

  const revenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const profit = rows.reduce((sum, row) => sum + (row.profit || 0), 0);
  const year = rows[0]?.date.slice(0, 4) || new Date().getFullYear();
  const salesToShow = dailySales;

  return (
    <>
      <div className="period-tabs" role="tablist" aria-label="Finance period">
        {periods.map(({ id, label }) => (
          <button
            key={id}
            role="tab"
            aria-selected={period === id}
            className={period === id ? 'active' : ''}
            onClick={() => setPeriod(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="finance-summary">
        <div className="card">
          <small>Total sales</small>
          <strong>{money(revenue)}</strong>
        </div>
        <div className="card">
          <small>Net profit</small>
          <strong>{money(profit)}</strong>
        </div>
      </div>
      {period === 'week' || period === 'month' ? (
        <section className="card table-scroll">
          <div className="card-heading">
            <h2>{period === 'week' ? 'This week' : `Months of ${year}`}</h2>
          </div>
          <table>
            <thead>
              <tr>
                <th>{period === 'week' ? 'Day' : 'Month'}</th>
                <th>Total sales</th>
                <th>Net profit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.date}>
                  <td>
                    <strong>
                      {new Date(row.date).toLocaleDateString('en-US', {
                        timeZone: 'Africa/Addis_Ababa',
                        weekday: period === 'week' ? 'long' : undefined,
                        month: period === 'month' ? 'long' : undefined,
                      })}
                    </strong>
                  </td>
                  <td>{money(row.revenue)}</td>
                  <td className="positive">{money(row.profit || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
      {period === 'day' && (
        <section className="card table-scroll">
          <div className="card-heading">
            <h2>Daily sales</h2>
          </div>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Item</th>
                <th>Quantity</th>
                <th>Total sales</th>
                <th>Net profit</th>
              </tr>
            </thead>
            <tbody>
              {salesToShow.map((item) => (
                <tr key={item.id}>
                  <td>
                    {new Date(item.date).toLocaleTimeString('en-US', {
                      timeZone: 'Africa/Addis_Ababa',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </td>
                  <td>
                    <strong>{item.name}</strong>
                  </td>
                  <td>{item.quantity}</td>
                  <td>{money(item.quantity * item.unitPrice)}</td>
                  <td className="positive">
                    {money(item.quantity * (item.unitPrice - (item.unitCost || 0)))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!salesToShow.length && <div className="empty">No sales recorded today.</div>}
        </section>
      )}
      {period === 'year' && <p className="finance-note">Totals for {year}</p>}
    </>
  );
}
