import { Booking, FinancialSettings } from '../types';
import { formatRupiah, formatDateIndo } from './formatters';

interface ExportFinancialData {
  grossRevenue: number;
  maintenanceAllocation: number;
  contentAllocation: number;
  operationalAllocation: number;
  netProfit: number;
  partner1Share: number;
  partner2Share: number;
}

/**
 * Ekspor data laporan rental dan finansial ke format Excel (.xls)
 */
export const exportBookingsToExcel = (
  bookings: Booking[],
  financialData: ExportFinancialData,
  settings: FinancialSettings,
  periodName: string = 'Oktober 2026'
) => {
  const tableRows = bookings
    .map(
      (b, idx) => `
    <tr>
      <td style="text-align: center;">${idx + 1}</td>
      <td style="font-family: monospace; font-weight: bold;">${b.bookingCode}</td>
      <td>${formatDateIndo(b.startDate)}</td>
      <td>${b.startTime} - ${b.endTime} WIB</td>
      <td>${b.durationValue} ${b.durationType}</td>
      <td style="font-weight: bold;">${b.customerName}</td>
      <td>'${b.customerPhone}</td>
      <td>${b.bikeName}</td>
      <td style="text-align: center;">${b.actualReturnTime ? `${b.actualReturnTime} WIB ${b.lateMinutes ? `(Telat ${b.lateMinutes}m)` : ''}` : '-'}</td>
      <td style="text-align: right; color: #b91c1c;">${b.lateFee || 0}</td>
      <td style="text-align: right; font-weight: bold;">${b.finalTotalPrice ?? (b.totalPrice + (b.lateFee || 0))}</td>
      <td style="text-align: center;">${b.paymentMethod === 'bayar_nanti' ? 'Bayar Nanti' : b.paymentMethod.toUpperCase()} (${b.paymentStatus === 'lunas' ? 'Lunas' : 'Belum Lunas'})</td>
      <td style="text-align: center;">${b.status}</td>
    </tr>
  `
    )
    .join('');

  const totalOmzet = bookings
    .filter(b => b.status === 'selesai')
    .reduce((sum, b) => sum + (b.finalTotalPrice ?? (b.totalPrice + (b.lateFee || 0))), 0);

  const excelContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Laporan Rental</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
      <style>
        body { font-family: Arial, sans-serif; }
        .header-title { font-size: 16pt; font-weight: bold; color: #047857; text-align: center; }
        .sub-header { font-size: 11pt; color: #475569; text-align: center; margin-bottom: 15px; }
        table { border-collapse: collapse; width: 100%; margin-top: 15px; }
        th { background-color: #0f172a; color: #ffffff; padding: 8px; font-size: 10pt; border: 1px solid #334155; }
        td { padding: 6px 8px; font-size: 9.5pt; border: 1px solid #cbd5e1; }
        .summary-table th { background-color: #047857; }
        .total-row { background-color: #f1f5f9; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header-title">KRAVENT BIKE - LAPORAN KEUANGAN & RENTAL SEPEDA</div>
      <div class="sub-header">Periode: ${periodName} • Dibuat Tanggal: ${new Date().toLocaleDateString('id-ID')}</div>

      <h3>1. RINGKASAN FINANSIAL & BAGI HASIL (${settings.partner1Percentage}/${settings.partner2Percentage})</h3>
      <table class="summary-table" style="width: 70%;">
        <tr>
          <th style="text-align: left;">Keterangan Pos Finansial</th>
          <th style="text-align: right;">Nominal (IDR)</th>
          <th style="text-align: left;">Keterangan Persentase</th>
        </tr>
        <tr>
          <td><strong>Total Omzet Kotor</strong></td>
          <td style="text-align: right; font-weight: bold; color: #047857;">${totalOmzet}</td>
          <td>100% dari transaksi berjalan</td>
        </tr>
        <tr>
          <td>Alokasi Pos Mentenest (Servis & Armada)</td>
          <td style="text-align: right; color: #b45309;">${financialData.maintenanceAllocation}</td>
          <td>${settings.maintenanceBudgetPercentage}% dari Omzet</td>
        </tr>
        <tr>
          <td>Alokasi Pos Konten (Gaji Konten Kreator & Ads)</td>
          <td style="text-align: right; color: #0369a1;">${financialData.contentAllocation}</td>
          <td>Nominal Uang Gaji Kreator</td>
        </tr>
        <tr>
          <td>Alokasi Pos Pengeluaran (Operasional Toko)</td>
          <td style="text-align: right; color: #7e22ce;">${financialData.operationalAllocation}</td>
          <td>${settings.operationalBudgetPercentage}% dari Omzet</td>
        </tr>
        <tr class="total-row">
          <td><strong>Laba Bersih Siap Bagi</strong></td>
          <td style="text-align: right; font-weight: bold; color: #059669;">${financialData.netProfit}</td>
          <td>Sisa Omzet setelah 3 Pos Biaya</td>
        </tr>
        <tr>
          <td><strong>${settings.partner1Name}</strong></td>
          <td style="text-align: right; font-weight: bold; color: #047857;">${financialData.partner1Share}</td>
          <td>Bagi Hasil ${settings.partner1Percentage}%</td>
        </tr>
        <tr>
          <td><strong>${settings.partner2Name}</strong></td>
          <td style="text-align: right; font-weight: bold; color: #b45309;">${financialData.partner2Share}</td>
          <td>Bagi Hasil ${settings.partner2Percentage}%</td>
        </tr>
      </table>

      <br/>
      <h3>2. DATA TRANSAKSI SEWA SEPEDA</h3>
      <div style="font-size: 9pt; color: #64748b; margin-bottom: 5px;">
        *Kebijakan Tarif: Hari Biasa (Senin-Jumat) Rp 8.000/jam | Sabtu, Minggu & Hari Libur Rp 10.000/jam
      </div>
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Kode Booking</th>
            <th>Tanggal</th>
            <th>Jam Sewa</th>
            <th>Durasi</th>
            <th>Nama Penyewa</th>
            <th>No WhatsApp</th>
            <th>Unit Sepeda</th>
            <th>Jam Kepulangan</th>
            <th>Denda Keterlambatan (Rp)</th>
            <th>Total Tagihan (Rp)</th>
            <th>Pembayaran</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="10" style="text-align: right;">TOTAL TRANSAKSI :</td>
            <td style="text-align: right; color: #047857;">${totalOmzet}</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = `Laporan_Rental_KraventBike_${periodName.replace(/\s+/g, '_')}.xls`;
  link.setAttribute('href', url);
  link.setAttribute('download', safeName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
