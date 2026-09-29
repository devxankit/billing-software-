import { 
  Document, Page, Text, View, StyleSheet, Image 
} from '@react-pdf/renderer';
import dayjs from 'dayjs';

// Styles matching the professional aesthetics
const styles = StyleSheet.create({
  page: { paddingTop: 25, paddingRight: 25, paddingBottom: 210, paddingLeft: 25, fontSize: 10, color: '#000', fontFamily: 'Helvetica' },
  
  // Header
  header: { flexDirection: 'row', borderWidth: 1, borderColor: '#ccc' },
  headerGarage: { flexDirection: 'row', backgroundColor: '#FFB800', padding: 20, borderRadius: 4, marginBottom: 15 },
  logoBox: { width: '68%', paddingTop: 12, paddingBottom: 12, paddingLeft: 10, flexDirection: 'row', alignItems: 'center' },
  logo: { width: 65, height: 45, objectFit: 'contain', marginRight: 15 },
  brandName: { fontSize: 24, fontWeight: 'bold', letterSpacing: -0.5 },
  slogan: { fontSize: 9, color: '#444', marginTop: 5 },
  
  metaBox: { width: '32%', borderLeftWidth: 1, borderLeftColor: '#ccc' },
  metaRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ccc', height: 36, alignItems: 'center' },
  metaLabel: { width: '45%', paddingLeft: 8, fontWeight: 'bold', fontSize: 9 },
  metaVal: { width: '55%', paddingLeft: 4, fontWeight: 'bold', fontSize: 9.5 },

  // Addressing Info Area
  addressArea: { flexDirection: 'row', borderWidth: 1, borderTopWidth: 0, borderColor: '#ccc', marginBottom: 15 },
  addressAreaGarage: { flexDirection: 'row', gap: 20, marginBottom: 20 },
  addrCol: { width: '50%', padding: 12 },
  addrColGarage: { width: '50%' },
  addrLabel: { fontWeight: 'bold', fontSize: 10, marginBottom: 6 },
  addrLabelGarage: { backgroundColor: '#FFB800', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 2, marginBottom: 10, fontSize: 9, fontWeight: 'bold', alignSelf: 'flex-start' },
  addrText: { fontSize: 8.5, color: '#333', lineHeight: 1.4 },

  // Summary Banner
  summaryBanner: { backgroundColor: '#FFB800', color: '#000', textAlign: 'center', padding: 8, fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 2 },
  summaryBannerGarage: { backgroundColor: '#FFB800', color: '#000', textAlign: 'center', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, fontWeight: 'bold', fontSize: 9, borderRadius: 2, marginBottom: 8 },

  // Table
  tableHeader: { 
    flexDirection: 'row', 
    backgroundColor: '#fdf7f2', 
    borderBottomWidth: 1, 
    borderLeftWidth: 1,
    borderColor: '#ccc',
    textAlign: 'left',
    fontWeight: 'bold',
    fontSize: 9,
    alignItems: 'stretch'
  },
  tableHeaderGarage: { 
    flexDirection: 'row', 
    backgroundColor: '#FFB800', 
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderColor: '#ccc',
    textAlign: 'left',
    fontWeight: 'bold',
    fontSize: 9,
    alignItems: 'stretch'
  },
  tableRow: { 
    flexDirection: 'row', 
    borderBottomWidth: 1, 
    borderLeftWidth: 1,
    borderColor: '#ccc', 
    alignItems: 'stretch',
    fontSize: 9,
    minHeight: 13
  },
  tableCellGarage: {
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: '#ccc',
    justifyContent: 'center'
  },
  
  // Pending Bills Specific Columns Transport
  colSrNo: { width: '8%', textAlign: 'left', paddingLeft: 4, borderRightWidth: 1, borderColor: '#ccc' },
  colBillNo: { width: '18%', textAlign: 'left', paddingLeft: 4, borderRightWidth: 1, borderColor: '#ccc' },
  colDate: { width: '15%', textAlign: 'left', paddingLeft: 4, borderRightWidth: 1, borderColor: '#ccc' },
  colVehicle: { width: '27%', textAlign: 'left', paddingLeft: 4, borderRightWidth: 1, borderColor: '#ccc' },
  colPendingAmt: { width: '17%', textAlign: 'left', fontWeight: 'bold', paddingLeft: 4, borderRightWidth: 1, borderColor: '#ccc' },
  colOverdue: { width: '15%', textAlign: 'left', paddingLeft: 4, borderRightWidth: 1, borderColor: '#ccc' },

  // Pending Bills Specific Columns Garage
  colSrNoGarage: { width: '8%', textAlign: 'left', paddingLeft: 8 },
  colBillNoGarage: { width: '18%', textAlign: 'left', paddingLeft: 8 },
  colDateGarage: { width: '15%', textAlign: 'left', paddingLeft: 8 },
  colVehicleGarage: { width: '27%', textAlign: 'left', paddingLeft: 8 },
  colPendingAmtGarage: { width: '17%', textAlign: 'left', fontWeight: 'bold', paddingLeft: 8 },
  colOverdueGarage: { width: '15%', textAlign: 'left', paddingLeft: 8 },

  // Footer Total Row
  totalRowArea: { flexDirection: 'row', borderWidth: 1, borderTopWidth: 0, borderColor: '#ccc' },
  gratitudeBanner: { width: '70%', backgroundColor: '#FFB800', color: '#000', padding: 12, textAlign: 'center', fontWeight: 'bold', fontSize: 10 },
  totalLabelBox: { width: '15%', backgroundColor: '#f9f9f9', padding: 12, textAlign: 'center', borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#ccc', fontWeight: 'bold' },
  totalValBox: { width: '15%', padding: 12, textAlign: 'left', paddingLeft: 4, fontWeight: 'bold', fontSize: 12 },
  
  totalRowGarage: { flexDirection: 'row', borderLeftWidth: 1, borderBottomWidth: 1, borderColor: '#ccc', marginTop: -1 },
  totalLabelGarage: { width: '80%', padding: 8, fontWeight: 'bold', textAlign: 'right', borderRightWidth: 1, borderColor: '#ccc' },
  totalValueGarage: { width: '20%', padding: 8, textAlign: 'left', paddingLeft: 8, fontWeight: 'bold', fontSize: 10, backgroundColor: '#f9f9f9', borderRightWidth: 1, borderColor: '#ccc' },

  // Bank Section
  bankSection: { marginTop: 15, borderWidth: 1, borderColor: '#ccc' },
  bankHeader: { backgroundColor: '#fdf3f0', paddingVertical: 4, paddingHorizontal: 10, fontSize: 8, fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: '#ccc' },
  bankContent: { padding: 10 },
  bankGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  bankItem: { width: '48%', flexDirection: 'row' },
  bankKey: { width: 80, fontSize: 8.5, color: '#555' },
  bankValue: { fontWeight: 'bold', fontSize: 9 },

  // Signature
  footerSection: { marginTop: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  footerBrand: { fontSize: 12, fontWeight: 'bold' },
  signBox: { width: 180, textAlign: 'center' },
  signLine: { borderTopWidth: 1, borderTopColor: '#000', marginTop: 35, marginBottom: 5 },
  signLabel: { fontSize: 8.5, fontWeight: 'bold' },
  
  termsBoxGarage: { width: '60%', borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 4, backgroundColor: '#fafafa' },
});

const chunkArray = (array, size) => {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

export const PDFPendingBills = ({ bills, groupName, groupPhone, groupEmail, business, isTransport, totalOutstanding }) => {
  const pendingBills = bills.filter(b => (b.grandTotal - (b.paidAmount || b.paymentReceived || 0)) > 0);
  const themeColor = isTransport ? '#FFB800' : '#FFB800';

  // Maximum 12 rows per page
  const itemChunks = pendingBills.length > 0 ? chunkArray(pendingBills, 12) : [[]];

  return (
    <Document>
      {itemChunks.map((chunk, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          <View fixed>
            {isTransport ? (
              <View style={styles.header}>
                <View style={styles.logoBox}>
                  <View style={{ width: 64, height: 64, backgroundColor: '#fff', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15, overflow: 'hidden', borderWidth: 1, borderStyle: 'solid', borderColor: '#eee' }}>
                    {business.logoUrl ? (
                      <Image src={business.logoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>{(business.businessName || 'B')[0]}</Text>
                    )}
                  </View>
                  <View>
                    <Text style={styles.brandName}>{business.businessName?.toUpperCase() || 'BUSINESS'}</Text>
                    <Text style={styles.slogan}>{business.slogan || 'Move What Matters'}</Text>
                  </View>
                </View>
                <View style={styles.metaBox}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Document:</Text>
                    <Text style={styles.metaVal}>Pending Bills</Text>
                  </View>
                  <View style={[styles.metaRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.metaLabel}>Date :</Text>
                    <Text style={styles.metaVal}>{dayjs().format('DD/MM/YYYY')}</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.headerGarage}>
                <View style={{ width: '60%' }}>
                  <Text style={{ fontSize: 22, fontWeight: 'heavy', marginBottom: 2 }}>Pending Bills Summary</Text>
                  <Text style={{ fontSize: 8.5, opacity: 0.9 }}>{business.slogan || 'Restoring Vehicles, Reviving Peace of Mind'}</Text>
                </View>
                <View style={{ width: '40%', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                   <View style={{ width: 44, height: 44, backgroundColor: '#fff', borderRadius: 8, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                     {business.logoUrl ? (
                       <Image src={business.logoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                     ) : (
                       <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{(business.businessName || 'B')[0]}</Text>
                     )}
                   </View>
                   <View style={{ textAlign: 'right' }}>
                     <Text style={{ fontSize: 12, fontWeight: 'bold' }}>{business.businessName?.toUpperCase()}</Text>
                     <Text style={{ fontSize: 7, marginTop: 4 }}>Date: {dayjs().format('DD/MM/YYYY')}</Text>
                   </View>
                </View>
              </View>
            )}

            <View style={isTransport ? styles.addressArea : styles.addressAreaGarage}>
              <View style={isTransport ? [styles.addrCol, { borderRightWidth: 1, borderColor: '#ccc', width: '100%' }] : [styles.addrColGarage, { width: '100%' }]}>
                <Text style={isTransport ? styles.addrLabel : styles.addrLabelGarage}>Party Details</Text>
                <Text style={[styles.addrText, { fontWeight: 'bold', fontSize: 10 }]}>{groupName}</Text>
                {groupPhone && <Text style={styles.addrText}><Text style={{ fontWeight: 'bold' }}>Mob :</Text> {groupPhone}</Text>}
                {groupEmail && <Text style={styles.addrText}><Text style={{ fontWeight: 'bold' }}>Email :</Text> {groupEmail}</Text>}
              </View>
            </View>

            {isTransport ? (
              <View style={styles.summaryBanner}><Text>Pending Bills</Text></View>
            ) : (
              <View style={styles.summaryBannerGarage}><Text>Outstanding Bills</Text></View>
            )}

            <View style={isTransport ? styles.tableHeader : styles.tableHeaderGarage}>
              {isTransport ? (
                <>
                  <Text style={[styles.colSrNo, { paddingVertical: 8 }]}>Sr No</Text>
                  <Text style={[styles.colBillNo, { paddingVertical: 8 }]}>Bill No</Text>
                  <Text style={[styles.colDate, { paddingVertical: 8 }]}>Bill Date</Text>
                  <Text style={[styles.colVehicle, { paddingVertical: 8 }]}>Vehicle No</Text>
                  <Text style={[styles.colPendingAmt, { paddingVertical: 8 }]}>Pending Amt</Text>
                  <Text style={[styles.colOverdue, { paddingVertical: 8 }]}>Overdue Days</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.tableCellGarage, styles.colSrNoGarage, { fontWeight: 'bold' }]}>Sr No</Text>
                  <Text style={[styles.tableCellGarage, styles.colBillNoGarage, { fontWeight: 'bold' }]}>Bill No</Text>
                  <Text style={[styles.tableCellGarage, styles.colDateGarage, { fontWeight: 'bold' }]}>Bill Date</Text>
                  <Text style={[styles.tableCellGarage, styles.colVehicleGarage, { fontWeight: 'bold' }]}>Vehicle No</Text>
                  <Text style={[styles.tableCellGarage, styles.colPendingAmtGarage, { fontWeight: 'bold' }]}>Pending Amt</Text>
                  <Text style={[styles.tableCellGarage, styles.colOverdueGarage, { borderRightWidth: 0, fontWeight: 'bold' }]}>Overdue</Text>
                </>
              )}
            </View>
          </View>

          <View>
            {chunk.map((b, idx) => {
              const pending = b.grandTotal - (b.paidAmount || b.paymentReceived || 0);
              let overdue = dayjs().diff(dayjs(b.billingDate || b.createdAt), 'day');
              if (overdue < 0) overdue = 0;
              let vNum = b.vehicleNo || b.vehicle?.vehicleNumber;
              if (!vNum && b.items && b.items.length > 0) {
                const uniqueVehicles = [...new Set(b.items.map(i => i.tempoNo || i.description).filter(Boolean))];
                if (uniqueVehicles.length > 0) {
                  vNum = uniqueVehicles[0];
                  if (uniqueVehicles.length > 1) {
                    vNum += ` (+${uniqueVehicles.length - 1})`;
                  }
                }
              }
              vNum = vNum || '—';
              const sNo = (pageIndex * 12) + idx + 1;
              return (
              <View key={b._id} style={styles.tableRow} wrap={false}>
                {isTransport ? (
                  <>
                    <Text style={[styles.colSrNo, { paddingVertical: 6 }]}>{sNo}</Text>
                    <Text style={[styles.colBillNo, { paddingVertical: 6 }]}>{b.billNumber || 'N/A'}</Text>
                    <Text style={[styles.colDate, { paddingVertical: 6 }]}>{dayjs(b.billingDate).format('DD/MM/YY')}</Text>
                    <Text style={[styles.colVehicle, { paddingVertical: 6 }]}>{vNum}</Text>
                    <Text style={[styles.colPendingAmt, { paddingVertical: 6 }]}>Rs. {pending.toLocaleString('en-IN', {minimumFractionDigits: 2})}</Text>
                    <Text style={[styles.colOverdue, { paddingVertical: 6 }]}>{overdue}</Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.tableCellGarage, styles.colSrNoGarage]}>{sNo}</Text>
                    <Text style={[styles.tableCellGarage, styles.colBillNoGarage]}>{b.billNumber || 'N/A'}</Text>
                    <Text style={[styles.tableCellGarage, styles.colDateGarage]}>{dayjs(b.billingDate).format('DD/MM/YY')}</Text>
                    <Text style={[styles.tableCellGarage, styles.colVehicleGarage]}>{vNum}</Text>
                    <Text style={[styles.tableCellGarage, styles.colPendingAmtGarage]}>Rs. {pending.toLocaleString('en-IN', {minimumFractionDigits: 2})}</Text>
                    <Text style={[styles.tableCellGarage, styles.colOverdueGarage, { borderRightWidth: 0 }]}>{overdue}</Text>
                  </>
                )}
              </View>
            )})}
            {pendingBills.length === 0 && (
              <View style={styles.tableRow} wrap={false}>
                 <Text style={{ width: '100%', padding: 20, textAlign: 'center', fontSize: 10 }}>No pending bills found.</Text>
              </View>
            )}

            {!isTransport && pageIndex === itemChunks.length - 1 && (
              <View style={{ marginTop: -1 }}>
                 <View style={styles.totalRowGarage}>
                   <Text style={[styles.totalLabelGarage, { fontWeight: 'bold', fontSize: 10 }]}>Total Outstanding</Text>
                   <Text style={[styles.totalValueGarage, { fontWeight: 'bold', fontSize: 11, backgroundColor: '#f2f2f2' }]}>Rs. {(totalOutstanding || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</Text>
                 </View>
              </View>
            )}
          </View>

          {isTransport && pageIndex === itemChunks.length - 1 && (
             <View wrap={false} style={{ marginTop: -1 }}>
               <View style={styles.totalRowArea}>
                 <View style={[styles.gratitudeBanner, { backgroundColor: themeColor }]}><Text>{business.notes && business.notes !== 'Grateful for Moving What Matters to You!' ? business.notes : ' '}</Text></View>
                 <View style={styles.totalLabelBox}><Text>OUTSTANDING:</Text></View>
                 <View style={styles.totalValBox}><Text>Rs. {(totalOutstanding || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</Text></View>
               </View>
             </View>
          )}

          <View fixed style={{ position: 'absolute', bottom: 25, left: 25, right: 25 }}>
            <View style={styles.bankSection}>
              <View style={[styles.bankHeader, { backgroundColor: isTransport ? '#f3f3f3' : '#fdf3f0', flexDirection: 'row', justifyContent: 'space-between' }]}>
                <Text>BANK DETAILS :</Text>
              </View>
              <View style={styles.bankContent}>
                <View style={styles.bankGrid}>
                  <View style={styles.bankItem}>
                    <Text style={styles.bankKey}>Bank Name:</Text>
                    <Text style={styles.bankValue}>{(business.bankDetails?.bankName || 'NOT PROVIDED').toUpperCase()}</Text>
                  </View>
                  <View style={styles.bankItem}>
                    <Text style={styles.bankKey}>IFSC Code:</Text>
                    <Text style={styles.bankValue}>{(business.bankDetails?.ifsc || 'NOT PROVIDED').toUpperCase()}</Text>
                  </View>
                </View>
                <View style={styles.bankGrid}>
                  <View style={styles.bankItem}>
                    <Text style={styles.bankKey}>Account No.:</Text>
                    <Text style={styles.bankValue}>{business.bankDetails?.accountNumber || 'NOT PROVIDED'}</Text>
                  </View>
                  <View style={styles.bankItem}>
                    <Text style={styles.bankKey}>Account Name:</Text>
                    <Text style={styles.bankValue}>{business.bankDetails?.accountName || 'NOT PROVIDED'}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={{ marginTop: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              {!isTransport ? (
                <View style={styles.termsBoxGarage}>
                  <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 5 }}>Terms and Conditions</Text>
                  <Text style={{ fontSize: 7, color: '#555', lineHeight: 1.4 }}>
                    This is a computer generated statement. Please report any discrepancies immediately.
                  </Text>
                </View>
              ) : (
                <View style={{ width: '60%' }}>
                  <Text style={styles.footerBrand}>{business.businessName?.toUpperCase()}</Text>
                  <Text style={{ fontSize: 7, color: '#666', marginTop: 2 }}>{business.slogan}</Text>
                </View>
              )}

              <View style={styles.signBox}>
                <Text style={styles.signLabel}>{isTransport ? `For ${business.businessName},` : 'Authorized Signatory'}</Text>
                {business.signatureUrl ? (
                  <Image src={business.signatureUrl} style={{ width: 100, height: 40, marginTop: 5, marginBottom: 2, alignSelf: 'center', objectFit: 'contain' }} />
                ) : (
                  <View style={styles.signLine} />
                )}
              </View>
            </View>
            
            <View style={{ textAlign: 'center', marginTop: 10 }}>
              <Text style={{ fontSize: 7, color: '#555', marginBottom: 2, fontWeight: 'bold' }}>Generated by transbilling.in</Text>
              <Text style={{ fontSize: 7, color: '#999' }} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
            </View>
          </View>
        </Page>
      ))}
    </Document>
  );
};
