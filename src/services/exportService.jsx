import pdfMake from 'pdfmake/build/pdfmake'
import pdfMakeFonts from 'pdfmake/build/vfs_fonts'

if (pdfMake && pdfMake.vfs) {
  pdfMake.vfs = pdfMakeFonts.pdfMake.vfs
}

export const generateWeeklyReportPDF = async (weeklyTotal, categoryData, expensesList) => {
  // 🔥 MODIFICADO: Agregamos la columna de "Concepto" a la cabecera
  const tableRows = [
    [
      { text: 'Fecha', style: 'tableHeader' },
      { text: 'Concepto', style: 'tableHeader' },
      { text: 'Categoría', style: 'tableHeader' },
      { text: 'Monto', style: 'tableHeader' }
    ]
  ]

  expensesList.forEach(item => {
    // 🔥 CORREGIDO: Ahora busca 'transaction_date' que es el nombre real en tu base de datos
    const dateToUse = item.transaction_date || item.expense_date || new Date().toISOString();
    const formattedDate = new Date(dateToUse).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short'
    })
    
    tableRows.push([
      { text: formattedDate, style: 'tableCell' },
      { text: item.concept || '---', style: 'tableCell' }, // 👈 Insertamos el concepto aquí
      { text: item.category || 'GENERAL', style: 'tableCell' },
      { text: '$' + parseFloat(item.amount).toFixed(2), style: 'tableCellAlignRight' }
    ])
  })

  const docDefinition = {
    content: [
      {
        text: 'SUPER AGENDA - REPORTE FINANCIERO',
        style: 'headerTitle',
        margin: [0, 0, 0, 5]
      },
      {
        text: 'Resumen acumulado de movimientos',
        style: 'headerSubtitle',
        margin: [0, 0, 0, 20]
      },
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'BALANCE TOTAL', style: 'sectionTitle', margin: [0, 0, 0, 5] },
              { text: '$' + weeklyTotal.toFixed(2), style: 'totalAmount' }
            ]
          },
          {
            width: '50%',
            stack: [
              { text: 'DISTRIBUCIÓN DE COMPRAS', style: 'sectionTitle', margin: [0, 0, 0, 5] },
              ...categoryData.map(cat => ({
                text: cat.name + ': $' + cat.value.toFixed(2),
                style: 'categoryItem',
                margin: [0, 2, 0, 2]
              }))
            ]
          }
        ],
        margin: [0, 0, 0, 20]
      },
      { 
        text: 'DESGLOSE DETALLADO DE TRANSACCIONES', 
        style: 'sectionTitle', 
        margin: [0, 10, 0, 10]
      },
      {
        style: 'tableExample',
        table: {
          headerRows: 1,
          // 🔥 MODIFICADO: Ajustamos los anchos para que quepan las 4 columnas perfectamente
          widths: ['15%', '35%', '25%', '25%'], 
          body: tableRows
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => '#e2e8f0',
          vLineColor: () => '#e2e8f0',
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6
        }
      }
    ],
    styles: {
      headerTitle: {
        fontSize: 18,
        bold: true,
        color: '#1c1917'
      },
      headerSubtitle: {
        fontSize: 11,
        color: '#78716c'
      },
      sectionTitle: {
        fontSize: 10,
        bold: true,
        color: '#78716c'
      },
      totalAmount: {
        fontSize: 32,
        bold: true,
        color: '#1c1917'
      },
      categoryItem: {
        fontSize: 11,
        color: '#444444'
      },
      tableHeader: {
        fontSize: 11,
        bold: true,
        color: '#ffffff',
        fillColor: '#1c1917'
      },
      tableCell: {
        fontSize: 10,
        color: '#1c1917'
      },
      tableCellAlignRight: {
        fontSize: 10,
        color: '#1c1917',
        alignment: 'right'
      }
    }
  }

  pdfMake.createPdf(docDefinition).download('SuperAgenda_Reporte.pdf')
}