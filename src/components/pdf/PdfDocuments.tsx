import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { ComparisonSheet, StoreSheet } from '../../services/pdfModel';

/** Documents A4 en noir et blanc. Chargés seulement au moment d'exporter (bibliothèque volumineuse). */
const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 36,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#000000',
  },
  title: { fontFamily: 'Helvetica-Bold', fontSize: 18 },
  subtitle: { fontSize: 11, marginTop: 4, marginBottom: 12 },
  section: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    marginTop: 10,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#999999',
  },
  box: {
    width: 11,
    height: 11,
    borderWidth: 1,
    borderColor: '#000000',
    marginRight: 8,
    marginTop: 1,
  },
  grow: { flexGrow: 1, flexShrink: 1 },
  bold: { fontFamily: 'Helvetica-Bold' },
  detail: { fontSize: 9, color: '#333333', marginTop: 1 },
  note: { fontSize: 9, fontFamily: 'Helvetica-Oblique', marginTop: 1 },
  quantity: { width: 80, textAlign: 'right' },
  price: { width: 80, textAlign: 'right' },
  total: { marginTop: 12, fontFamily: 'Helvetica-Bold', fontSize: 12, textAlign: 'right' },
  notes: { marginTop: 16, fontSize: 8, color: '#333333' },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    fontSize: 8,
    color: '#555555',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  first: { flex: 2.2, paddingRight: 4 },
  cell: { flex: 1, textAlign: 'right', paddingHorizontal: 2 },
  head: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },
});

function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Text>Panier malin</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

export function StoreSheetDocument({ sheet }: { sheet: StoreSheet }) {
  return (
    <Document title={sheet.title} author="Panier malin" language="fr">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{sheet.title}</Text>
        <Text style={styles.subtitle}>{sheet.subtitle}</Text>
        {sheet.rows.map((row, i) => (
          <View key={i} wrap={false}>
            {row.sectionStart && <Text style={styles.section}>{row.section}</Text>}
            <View style={styles.row}>
              <View style={styles.box} />
              <View style={styles.grow}>
                <Text style={styles.bold}>{row.name}</Text>
                {row.detail && <Text style={styles.detail}>{row.detail}</Text>}
                {row.note && <Text style={styles.note}>{row.note}</Text>}
              </View>
              <Text style={styles.quantity}>{row.quantity}</Text>
              {sheet.showPrices && <Text style={styles.price}>{row.price ?? '?'}</Text>}
            </View>
          </View>
        ))}
        {sheet.total && <Text style={styles.total}>{sheet.total}</Text>}
        <View style={styles.notes}>
          {sheet.notes.map((n, i) => (
            <Text key={i}>{n}</Text>
          ))}
        </View>
        <Footer />
      </Page>
    </Document>
  );
}

export function ComparisonDocument({ sheet }: { sheet: ComparisonSheet }) {
  return (
    <Document title={sheet.title} author="Panier malin" language="fr">
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>{sheet.title}</Text>
        <Text style={styles.subtitle}>{sheet.subtitle}</Text>
        <View style={styles.head}>
          <Text style={[styles.first, styles.bold]}>Article</Text>
          {sheet.columns.map((c, i) => (
            <Text key={i} style={[styles.cell, styles.bold]}>
              {c}
            </Text>
          ))}
        </View>
        {sheet.rows.map((row, i) => (
          <View key={i} style={styles.row} wrap={false}>
            <View style={styles.first}>
              <Text style={styles.bold}>{row.name}</Text>
              <Text style={styles.detail}>{row.quantity}</Text>
            </View>
            {row.cells.map((c, j) => (
              <Text key={j} style={row.best[j] ? [styles.cell, styles.bold] : styles.cell}>
                {c}
              </Text>
            ))}
          </View>
        ))}
        <View style={[styles.row, { borderBottomWidth: 0 }]} wrap={false}>
          <Text style={[styles.first, styles.bold]}>{sheet.totalLabel}</Text>
          {sheet.totals.map((t, j) => (
            <View key={j} style={styles.cell}>
              <Text style={styles.bold}>{t}</Text>
              <Text style={styles.detail}>{sheet.coverage[j]}</Text>
            </View>
          ))}
        </View>
        <View style={styles.notes}>
          {sheet.notes.map((n, i) => (
            <Text key={i}>{n}</Text>
          ))}
        </View>
        <Footer />
      </Page>
    </Document>
  );
}
