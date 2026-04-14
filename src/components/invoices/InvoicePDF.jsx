import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer'
import { format, parseISO } from 'date-fns'

// Registrar fuentes si se deseara, por ahora usaremos Helvetica (por defecto)

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
    fontSize: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#47624f',
    paddingBottom: 20,
  },
  logo: {
    width: 120,
    maxHeight: 60,
    objectFit: 'contain',
  },
  issuerInfo: {
    alignItems: 'flex-end',
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#47624f',
    marginBottom: 4,
  },
  legalName: {
    fontSize: 12,
    marginBottom: 2,
  },
  invoiceMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  invoiceInfoRight: {
    alignItems: 'flex-end',
  },
  invoiceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#47624f',
    marginBottom: 8,
  },
  partiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  partyBox: {
    width: '48%',
  },
  partyTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#47624f',
    marginBottom: 6,
  },
  partyText: {
    marginBottom: 2,
    lineHeight: 1.4,
  },
  table: {
    width: '100%',
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#47624f',
    padding: 8,
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 8,
  },
  colDesc: { width: '45%' },
  colQty: { width: '15%', textAlign: 'center' },
  colPrice: { width: '20%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },
  totalsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 30,
  },
  totalsBox: {
    width: '40%',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalTitle: {
    fontWeight: 'bold',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#47624f',
  },
  grandTotalText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#47624f',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerText: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 4,
  },
})

// Helper para formatear moneda
const formatCurrency = (amount, currencyStr) => {
  if (amount === undefined || amount === null) return ''
  const symbol = currencyStr === 'ARS' ? '$' : currencyStr === 'EUR' ? '€' : '$'
  return `${symbol}${Number(amount).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function InvoicePDF({ invoice, settings, client, items }) {
  const getSymbol = (c) => c === 'EUR' ? '€' : '$'
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Header (Logo + Issuer) */}
        <View style={styles.header}>
          <View>
            {settings?.logo_url ? (
              <Image style={styles.logo} src={settings.logo_url} />
            ) : (
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#47624f' }}>{settings?.company_name || 'APOC AUTOMATION'}</Text>
            )}
          </View>
          <View style={styles.issuerInfo}>
            <Text style={styles.companyName}>{settings?.company_name || 'Apoc Automation'}</Text>
            {settings?.legal_name && <Text style={styles.legalName}>{settings.legal_name}</Text>}
            {settings?.cuit && <Text style={styles.partyText}>CUIT: {settings.cuit}</Text>}
            {settings?.email && <Text style={styles.partyText}>{settings.email}</Text>}
            {settings?.phone && <Text style={styles.partyText}>{settings.phone}</Text>}
          </View>
        </View>

        {/* Invoice Meta */}
        <View style={styles.invoiceMeta}>
          <View>
            <Text style={styles.invoiceTitle}>FACTURA</Text>
          </View>
          <View style={styles.invoiceInfoRight}>
            <Text style={styles.partyTitle}>N° {invoice?.number || 'Borrador'}</Text>
            <Text style={styles.partyText}>Fecha de emisión: {invoice?.issue_date ? format(parseISO(invoice.issue_date), 'dd/MM/yyyy') : '-'}</Text>
            {invoice?.due_date && <Text style={styles.partyText}>Vencimiento: {format(parseISO(invoice.due_date), 'dd/MM/yyyy')}</Text>}
            <Text style={styles.partyText}>Moneda: {invoice?.currency || 'USD'}</Text>
          </View>
        </View>

        {/* Parties Row */}
        <View style={styles.partiesRow}>
          <View style={styles.partyBox}>
            <Text style={styles.partyTitle}>EMISOR</Text>
            <Text style={styles.partyText}>{settings?.legal_name || settings?.company_name}</Text>
            {settings?.cuit && <Text style={styles.partyText}>CUIT: {settings.cuit}</Text>}
            {settings?.address && <Text style={styles.partyText}>{settings.address}</Text>}
            {settings?.city && <Text style={styles.partyText}>{settings.city}{settings?.country ? `, ${settings.country}` : ''}</Text>}
          </View>
          <View style={styles.partyBox}>
            <Text style={styles.partyTitle}>CLIENTE</Text>
            <Text style={styles.partyText}>{client?.legal_name || client?.name || 'Consumidor Final'}</Text>
            {client?.tax_id && <Text style={styles.partyText}>{client?.tax_id_type || 'CUIT'}: {client.tax_id}</Text>}
            {client?.address && <Text style={styles.partyText}>{client.address}</Text>}
            {client?.city && <Text style={styles.partyText}>{client.city}{client?.country ? `, ${client.country}` : ''}</Text>}
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDesc]}>DESCRIPCIÓN</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>CANT</Text>
            <Text style={[styles.tableHeaderCell, styles.colPrice]}>P. UNIT</Text>
            <Text style={[styles.tableHeaderCell, styles.colTotal]}>SUBTOTAL</Text>
          </View>
          
          {items?.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{formatCurrency(item.unit_price, invoice?.currency)}</Text>
              <Text style={styles.colTotal}>{formatCurrency(item.quantity * item.unit_price, invoice?.currency)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.partyText}>SUBTOTAL:</Text>
              <Text style={styles.partyText}>{formatCurrency(invoice?.subtotal, invoice?.currency)}</Text>
            </View>
            {invoice?.discount_amount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.partyText}>DESCUENTO:</Text>
                <Text style={styles.partyText}>-{formatCurrency(invoice.discount_amount, invoice?.currency)}</Text>
              </View>
            )}
            {invoice?.iva_amount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.partyText}>IVA ({invoice.iva_percent}%):</Text>
                <Text style={styles.partyText}>{formatCurrency(invoice.iva_amount, invoice?.currency)}</Text>
              </View>
            )}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalText}>TOTAL {invoice?.currency || 'USD'}:</Text>
              <Text style={styles.grandTotalText}>{formatCurrency(invoice?.total, invoice?.currency)}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {invoice?.payment_method && (
            <Text style={styles.footerText}>Método de pago: {invoice.payment_method}</Text>
          )}
          {settings?.bank_info && (
            <Text style={styles.footerText}>Datos bancarios: {settings.bank_info}</Text>
          )}
          {invoice?.notes && (
            <Text style={[styles.footerText, { marginTop: 10, color: '#1a1a1a' }]}>Notas: {invoice.notes}</Text>
          )}
        </View>

      </Page>
    </Document>
  )
}
