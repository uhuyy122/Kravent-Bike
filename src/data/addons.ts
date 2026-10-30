export interface AddonDefinition {
  id: string;
  name: string;
  icon: string;
  price: number; // Flat sekali sewa
  maxStock: number;
  description: string;
  badge: string;
}

export const OFFICIAL_ADDONS: AddonDefinition[] = [
  {
    id: 'helm',
    name: 'Helm Sepeda',
    icon: '⛑️',
    price: 3000,
    maxStock: 4,
    description: 'Helm pelindung kepala SNI/gowes aman',
    badge: 'Stok: 4 Unit',
  },
  {
    id: 'tripod',
    name: 'Tripod',
    icon: '📸',
    price: 5000,
    maxStock: 1,
    description: 'Tripod fleksibel untuk konten/foto gowes',
    badge: 'Stok: 1 Unit',
  },
  {
    id: 'holder_hp',
    name: 'Holder HP',
    icon: '📱',
    price: 3000,
    maxStock: 4,
    description: 'Dudukan ponsel stang untuk navigasi GPS / peta',
    badge: 'Stok: 4 Unit',
  },
  {
    id: 'gembok',
    name: 'Gembok Sepeda',
    icon: '🔒',
    price: 2000,
    maxStock: 3,
    description: 'Kunci kawat gembok sepeda spiral dengan kunci',
    badge: 'Stok: 3 Unit',
  },
  {
    id: 'mineral_water',
    name: 'Mineral Water',
    icon: '💧',
    price: 5000,
    maxStock: 50,
    description: 'Air mineral dingin botol 600ml untuk hidrasi',
    badge: 'Selalu Tersedia',
  },
  {
    id: 'boncengan_bayi',
    name: 'Boncengan Bayi',
    icon: '👶',
    price: 10000,
    maxStock: 1,
    description: 'Kursi boncengan anak/bayi empuk dengan sabuk pengaman',
    badge: 'Stok: 1 Unit',
  },
];
