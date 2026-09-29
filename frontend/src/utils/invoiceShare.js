import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export const invoiceFileName = (bill) =>
  `Invoice_${(bill.billNumber || bill._id).replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`

// Render every invoice page inside `root` into one A4 PDF File
export async function buildInvoicePdfFile(root, fileName) {
  const pages = root.querySelectorAll('.invoice-wrap, .garage-invoice-wrap')
  if (pages.length === 0) throw new Error('No invoice content found to share')

  const pdfDoc = new jsPDF('p', 'mm', 'a4')
  for (let i = 0; i < pages.length; i++) {
    const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' })
    const imgData = canvas.toDataURL('image/jpeg', 0.75)
    if (i > 0) pdfDoc.addPage()
    pdfDoc.addImage(imgData, 'JPEG', 0, 0, pdfDoc.internal.pageSize.getWidth(), pdfDoc.internal.pageSize.getHeight(), undefined, 'FAST')
  }
  return new File([pdfDoc.output('blob')], fileName, { type: 'application/pdf' })
}

// Share a PDF: Flutter native bridge → Web Share API → plain download
export async function sharePdfFile(pdfFile, shareData) {
  const hasFlutterBridge = window.FlutterShareBridge || window.webkit?.messageHandlers?.FlutterShareBridge
  if (hasFlutterBridge) {
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result.split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(pdfFile)
    })
    const payload = JSON.stringify({ fileName: pdfFile.name, fileData: base64Data, mimeType: 'application/pdf' })
    if (window.FlutterShareBridge?.postMessage) window.FlutterShareBridge.postMessage(payload)
    else window.webkit?.messageHandlers?.FlutterShareBridge?.postMessage?.(payload)
    return
  }

  if (navigator.share) {
    const fileShareData = { files: [pdfFile], title: pdfFile.name }
    const canShareFiles = navigator.canShare ? navigator.canShare(fileShareData) : true
    if (canShareFiles) {
      try {
        await navigator.share(fileShareData)
      } catch (shareErr) {
        // Cancelled or gesture expired: don't fall back to a second share sheet
        if (shareErr.name !== 'AbortError' && shareErr.name !== 'NotAllowedError' && shareData) {
          await navigator.share(shareData)
        }
      }
    } else if (shareData) {
      await navigator.share(shareData)
    }
    return
  }

  const url = URL.createObjectURL(pdfFile)
  const a = document.createElement('a')
  a.href = url
  a.download = pdfFile.name
  a.click()
  URL.revokeObjectURL(url)
  alert('Sharing not supported on this browser. File has been downloaded.')
}
