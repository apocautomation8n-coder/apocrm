import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { format } from 'date-fns'

const styles = StyleSheet.create({
  page: {
    paddingTop: 45,
    paddingBottom: 50,
    paddingHorizontal: 40,
    backgroundColor: '#0a0a0a',
    fontFamily: 'Helvetica',
    color: '#ffffff',
  },
  leftLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 15,
    width: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    alignItems: 'flex-start',
  },
  logoContainer: {
    flexDirection: 'column',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoImage: {
    width: 160,
    maxHeight: 40,
    objectFit: 'contain',
  },
  logoText1: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
  logoText2: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#a3e635',
    letterSpacing: 1,
  },
  logoSubtitle: {
    fontSize: 6,
    color: '#a1a1aa',
    marginTop: 6,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerPresupuestoText: {
    fontSize: 7,
    color: '#a1a1aa',
    letterSpacing: 1,
  },
  headerNumberText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#a3e635',
    marginTop: 4,
  },
  card: {
    borderWidth: 1,
    borderColor: '#27272a',
    backgroundColor: '#121212',
    padding: 16,
    marginBottom: 16,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 8,
    color: '#a3e635',
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  projectTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
  },
  text: {
    fontSize: 9,
    color: '#d4d4d8',
    lineHeight: 1.5,
    marginBottom: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  gridCol: {
    width: '50%',
  },
  gridTitle: {
    fontSize: 7,
    color: '#a3e635',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingRight: 10,
  },
  bulletIcon: {
    width: 8,
    color: '#a1a1aa',
    fontSize: 8,
  },
  bulletCheck: {
    width: 10,
    color: '#a3e635',
    fontSize: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 8,
    color: '#d4d4d8',
    lineHeight: 1.4,
  },
  timeBadge: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#3f3f46',
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    borderRadius: 2,
  },
  timeBadgeText: {
    fontSize: 7,
    color: '#a3e635',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pricingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 16,
  },
  pricingCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#a3e635',
    backgroundColor: '#121212',
    padding: 16,
    borderRadius: 2,
  },
  recommendedBadge: {
    backgroundColor: '#a3e635',
    paddingVertical: 3,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
    borderRadius: 1,
  },
  recommendedText: {
    fontSize: 6,
    fontWeight: 'bold',
    color: '#0a0a0a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionTitle: {
    fontSize: 7,
    color: '#a1a1aa',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  optionName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#a3e635',
    marginTop: 10,
    marginBottom: 2,
  },
  priceBox: {
    backgroundColor: '#0a0a0a',
    padding: 8,
    borderRadius: 2,
    marginTop: 8,
    marginBottom: 10,
  },
  priceBoxText: {
    fontSize: 7,
    color: '#a3e635',
    lineHeight: 1.4,
  },
  includesTitle: {
    fontSize: 7,
    color: '#a3e635',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 7,
    color: '#71717a',
  },
  lineBreak: {
    height: 1,
    backgroundColor: '#27272a',
    marginVertical: 10,
  }
})

const formatMoney = (amount, currency) => {
  if (amount === undefined || amount === null || Number.isNaN(Number(amount))) return ''
  const symbol = currency === 'ARS' ? '$' : currency === 'EUR' ? '€' : '$'
  const locale = currency === 'ARS' ? 'es-AR' : 'en-US'
  return `${symbol}${Number(amount).toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export default function BudgetPDF({ budget, settings }) {
  const currency = budget?.currency || 'ARS'
  const number = budget?.number || '00000'
  const displayNum = number.replace('PRE-', '')
  const validityDays = budget?.validity_days ?? 15

  // Default logic for splitting company name visually if no logo is provided
  const companyName = settings?.company_name || 'APOC AUTOMATION'
  const firstWord = companyName.split(' ')[0] || 'APOC'
  const restWords = companyName.substring(companyName.indexOf(' ')).trim() || 'AUTOMATION'

  const isValidImage = (url) => {
    if (!url) return false
    const lower = url.toLowerCase()
    return !lower.endsWith('.svg') && !url.startsWith('data:image/svg+xml')
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Left vertical line accent */}
        <View style={styles.leftLine} />

        <View style={styles.header}>
          <View style={styles.logoContainer}>
            {settings?.logo_url && isValidImage(settings.logo_url) ? (
              <Image style={styles.logoImage} src={settings.logo_url} />
            ) : (
              <View style={styles.logoRow}>
                <Text style={styles.logoText1}>{firstWord.toUpperCase()} </Text>
                <Text style={styles.logoText2}>{restWords.toUpperCase()}</Text>
              </View>
            )}
            <Text style={styles.logoSubtitle}>AUTOMATIZACION - DESARROLLO WEB - SISTEMAS A MEDIDA</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerPresupuestoText}>PRESUPUESTO</Text>
            <Text style={styles.headerNumberText}>#{displayNum}</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { marginBottom: 6 }]}>DESCRIPCION DEL SERVICIO</Text>
        <View style={styles.card}>
          <Text style={styles.projectTitle}>{budget?.title || 'Propuesta Comercial y Técnica'}</Text>
          {budget?.description && <Text style={styles.text}>{budget.description}</Text>}
          {budget?.scope && <Text style={styles.text}>{budget.scope}</Text>}
          
          <View style={styles.grid}>
            <View style={styles.gridCol}>
              {Array.isArray(budget?.features) && budget.features.length > 0 && (
                <View>
                  <Text style={styles.gridTitle}>FUNCIONALIDADES INCLUIDAS</Text>
                  {budget.features.map((f, i) => (
                    <View style={styles.bulletRow} key={i}>
                      <Text style={styles.bulletIcon}>•</Text>
                      <Text style={styles.bulletText}>{f}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            <View style={styles.gridCol}>
              {Array.isArray(budget?.suggested_tech) && budget.suggested_tech.length > 0 && (
                <View>
                  <Text style={styles.gridTitle}>TECNOLOGIAS SUGERIDAS</Text>
                  {budget.suggested_tech.map((t, i) => (
                    <View style={styles.bulletRow} key={i}>
                      <Text style={styles.bulletIcon}>•</Text>
                      <Text style={styles.bulletText}>{t}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {budget?.estimated_time && (
            <View style={styles.timeBadge}>
              <Text style={styles.timeBadgeText}>TIEMPO ESTIMADO: {budget.estimated_time}</Text>
            </View>
          )}
        </View>

        <Text style={[styles.sectionTitle, { marginBottom: 6, marginTop: 10 }]}>MODALIDADES DE CONTRATACION</Text>
        <View style={styles.pricingContainer} wrap={false}>
          <View style={styles.pricingCard}>
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedText}>RECOMENDADO</Text>
            </View>
            <Text style={styles.optionTitle}>OPCION A</Text>
            <Text style={styles.optionName}>Pago Único</Text>
            <Text style={styles.text}>Desarrollo completo con entrega lista para usar y puesta en producción.</Text>
            
            <Text style={styles.priceValue}>{formatMoney(budget?.estimated_price, currency)} {currency}</Text>
            <Text style={[styles.text, { marginBottom: 2 }]}>pago único</Text>
            
            {budget?.payment_plan && (
              <View style={styles.priceBox}>
                <Text style={styles.priceBoxText}>{budget.payment_plan}</Text>
              </View>
            )}

            <Text style={styles.includesTitle}>INCLUYE</Text>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletCheck}>✓</Text>
              <Text style={styles.bulletText}>Instalación completa</Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletCheck}>✓</Text>
              <Text style={styles.bulletText}>Configuración inicial</Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletCheck}>✓</Text>
              <Text style={styles.bulletText}>Entrega lista para usar</Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={styles.bulletCheck}>✓</Text>
              <Text style={styles.bulletText}>Soporte post-entrega ({validityDays} días)</Text>
            </View>
          </View>

          <View style={[styles.pricingCard, { borderColor: '#27272a' }]}>
            <Text style={[styles.optionTitle, { marginTop: 22 }]}>OPCION B</Text>
            <Text style={styles.optionName}>Suscripción Mensual</Text>
            <Text style={styles.text}>Desarrollo completo con mantenimiento y uso del sistema como servicio (SaaS).</Text>
            
            <Text style={[styles.priceValue, { color: budget?.estimated_monthly_price ? '#a3e635' : '#a1a1aa' }]}>
              {budget?.estimated_monthly_price ? `${formatMoney(budget.estimated_monthly_price, currency)}` : 'A cotizar'}
            </Text>
            <Text style={[styles.text, { marginBottom: 2 }]}>{currency} / por mes</Text>
            
            <View style={[styles.priceBox, { borderColor: '#27272a', borderWidth: 1, backgroundColor: '#0a0a0a' }]}>
              <Text style={[styles.priceBoxText, { color: '#71717a' }]}>
                {budget?.estimated_monthly_price 
                  ? 'Suscripción sujeta a términos de mantenimiento evolutivo y hosting.'
                  : 'Opción disponible bajo consulta según requerimientos de servidor.'}
              </Text>
            </View>

            <Text style={[styles.includesTitle, { color: budget?.estimated_monthly_price ? '#a3e635' : '#a1a1aa' }]}>INCLUYE</Text>
            <View style={styles.bulletRow}>
              <Text style={[styles.bulletCheck, { color: budget?.estimated_monthly_price ? '#a3e635' : '#a1a1aa' }]}>✓</Text>
              <Text style={styles.bulletText}>Uso completo del sistema</Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={[styles.bulletCheck, { color: budget?.estimated_monthly_price ? '#a3e635' : '#a1a1aa' }]}>✓</Text>
              <Text style={styles.bulletText}>Mantenimiento mensual</Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={[styles.bulletCheck, { color: budget?.estimated_monthly_price ? '#a3e635' : '#a1a1aa' }]}>✓</Text>
              <Text style={styles.bulletText}>Soporte técnico continuo</Text>
            </View>
            <View style={styles.bulletRow}>
              <Text style={[styles.bulletCheck, { color: budget?.estimated_monthly_price ? '#a3e635' : '#a1a1aa' }]}>✓</Text>
              <Text style={styles.bulletText}>Respaldo de información</Text>
            </View>
          </View>
        </View>

        {(budget?.observations || budget?.conditions) && (
          <View wrap={false}>
            <Text style={[styles.sectionTitle, { marginBottom: 6, marginTop: 4 }]}>OBJETIVO Y CONDICIONES</Text>
            <View style={styles.card}>
              {budget?.observations && <Text style={styles.text}>{budget.observations}</Text>}
              {budget?.observations && budget?.conditions && <View style={styles.lineBreak} />}
              {budget?.conditions && <Text style={styles.text}>{budget.conditions}</Text>}
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Desarrollado por {companyName}</Text>
          <Text style={styles.footerText}>Presupuesto válido por {validityDays} días</Text>
        </View>
      </Page>
    </Document>
  )
}
