import { formatearMoneda, aNumero } from './moneda.js';

export function exportTransactionsToPDF(transactions = []) {
  if (!transactions || transactions.length === 0) {
    alert('No hay movimientos para exportar.');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor, permite las ventanas emergentes para exportar el PDF.');
    return;
  }

  // 1. ORDENAR: Primero todos los Ingresos, luego todos los Egresos
  const sortedTransactions = [...transactions].sort((a, b) => {
    if (a.transaction_type === 'income' && b.transaction_type !== 'income') return -1;
    if (a.transaction_type !== 'income' && b.transaction_type === 'income') return 1;
    return 0;
  });

  // 2. Calcular totales
  const totalIncome = transactions
    .filter(t => t.transaction_type === 'income')
    .reduce((acc, curr) => acc + aNumero(curr.amount), 0);

  const totalExpense = transactions
    .filter(t => t.transaction_type === 'expense')
    .reduce((acc, curr) => acc + aNumero(curr.amount), 0);

  const netBalance = totalIncome - totalExpense;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Reporte Financiero - Super Agenda & Finanzas</title>
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }
        body {
          font-family: 'Courier New', Courier, monospace;
          color: #000;
          background: #fff;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .container {
          max-width: 100%;
          margin: 0 auto;
        }
        .header {
          border-bottom: 4px solid #000;
          padding-bottom: 12px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        h1 {
          font-size: 20px;
          text-transform: uppercase;
          margin: 0 0 4px 0;
          font-weight: 900;
        }
        .meta {
          font-size: 10px;
          color: #333;
          font-weight: bold;
          text-transform: uppercase;
        }
        .summary-cards {
          display: flex;
          gap: 12px;
          margin-top: 25px;
        }
        .card {
          border: 3px solid #000;
          padding: 12px 15px;
          border-radius: 12px;
          flex: 1;
          background: #fdfbf7;
          box-shadow: 3px 3px 0px 0px rgba(0,0,0,1);
        }
        .card-title {
          font-size: 9px;
          text-transform: uppercase;
          font-weight: bold;
          color: #555;
        }
        .card-value {
          font-size: 15px;
          font-weight: 900;
          margin-top: 5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        th, td {
          border: 2px solid #000;
          padding: 10px 12px;
          font-size: 11px;
          text-align: left;
          text-transform: uppercase;
        }
        th {
          background-color: #fef08a !important;
          font-weight: 900;
        }
        .expense {
          color: #b91c1c;
          font-weight: 900;
        }
        .income {
          color: #047857;
          font-weight: 900;
        }
        .footer {
          margin-top: 35px;
          font-size: 9px;
          text-align: center;
          border-top: 2px dashed #000;
          padding-top: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div>
            <h1>📄 Reporte Ejecutivo de Movimientos</h1>
            <div class="meta">Super Agenda & Finanzas</div>
          </div>
          <div class="meta" style="text-align: right;">
            Generado: ${new Date().toLocaleString()}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Concepto / Categoría</th>
              <th>Tipo</th>
              <th>Usuario</th>
              <th>Fecha y Hora</th>
              <th>Monto</th>
            </tr>
          </thead>
          <tbody>
            ${sortedTransactions.map(tx => {
              const isIncome = tx.transaction_type === 'income';
              return `
                <tr>
                  <td><strong>${tx.concept || tx.category || 'GENERAL'}</strong></td>
                  <td>${isIncome ? '🟢 Ingreso' : '🔴 Egreso'}</td>
                  <td>${tx.user_name || 'LUIS'}</td>
                  <td>${new Date(tx.created_at || Date.now()).toLocaleDateString()} • ${new Date(tx.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td class="${isIncome ? 'income' : 'expense'}">
                    ${isIncome ? '+' : '-'}${formatearMoneda(tx.amount)}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div>
          <h3 style="font-size: 12px; text-transform: uppercase; font-weight: 900; margin-top: 25px; margin-bottom: 10px;">📊 Suma Total y Balance</h3>
          <div class="summary-cards">
            <div class="card">
              <div class="card-title">Total Ingresos</div>
              <div class="card-value income">+${formatearMoneda(totalIncome)}</div>
            </div>
            <div class="card">
              <div class="card-title">Total Egresos</div>
              <div class="card-value expense">-${formatearMoneda(totalExpense)}</div>
            </div>
            <div class="card" style="background-color: ${netBalance >= 0 ? '#d1fae5' : '#fee2e2'};">
              <div class="card-title">Balance Neto Final</div>
              <div class="card-value" style="color: ${netBalance >= 0 ? '#047857' : '#b91c1c'}">
                ${formatearMoneda(netBalance)}
              </div>
            </div>
          </div>
        </div>

        <div class="footer">
          Super Agenda & Finanzas • Documento Oficial
        </div>
      </div>

      <script>
        window.onload = () => {
          window.print();
          window.setTimeout(() => window.close(), 600);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}