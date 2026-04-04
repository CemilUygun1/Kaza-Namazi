export type PrayerKey = 'sabah' | 'ogle' | 'ikindi' | 'aksam' | 'yatsi' | 'vitir';
export type Counts = Record<PrayerKey, number>;

export type PrayerTimesData = {
  imsak: string;
  gunes: string;
  ogle: string;
  ikindi: string;
  aksam: string;
  yatsi: string;
};

export type City = { SehirID: string; SehirAdi: string; SehirAdiEn: string };
export type District = { IlceID: string; IlceAdi: string };

export type UserProfile = {
  gender: 'male' | 'female';
  birthYear: number;
  pubertyAge: number;
  startedPrayingYear: number | null;
  menstruationDays: number;
  includeVitir: boolean;
  onboardingComplete: boolean;
};

export type LocationData = {
  cityId: string;
  cityName: string;
  districtId: string;
  districtName: string;
};

export type TabName = 'home' | 'statistics' | 'zikirmatik' | 'calendar';

export type CompletionLog = Record<string, Record<PrayerKey, number>>;

export const PRAYERS: Array<{ key: PrayerKey; label: string }> = [
  { key: 'sabah', label: 'Sabah' },
  { key: 'ogle', label: 'Öğle' },
  { key: 'ikindi', label: 'İkindi' },
  { key: 'aksam', label: 'Akşam' },
  { key: 'yatsi', label: 'Yatsı' },
  { key: 'vitir', label: 'Vitir' },
];

export const PRAYER_TIME_LABELS = [
  { key: 'imsak', label: 'İmsak' },
  { key: 'gunes', label: 'Güneş' },
  { key: 'ogle', label: 'Öğle' },
  { key: 'ikindi', label: 'İkindi' },
  { key: 'aksam', label: 'Akşam' },
  { key: 'yatsi', label: 'Yatsı' },
] as const;

export const DEFAULT_COUNTS: Counts = {
  sabah: 0, ogle: 0, ikindi: 0, aksam: 0, yatsi: 0, vitir: 0,
};

export const DEFAULT_PROFILE: UserProfile = {
  gender: 'male',
  birthYear: 1990,
  pubertyAge: 12,
  startedPrayingYear: null,
  menstruationDays: 0,
  includeVitir: true,
  onboardingComplete: false,
};

export const THEME = {
  primary: '#6B8F71',
  primaryDark: '#5A7D60',
  primaryLight: '#8AAE8F',
  primaryVeryLight: '#DCE8DE',
  background: '#F5F0EB',
  card: '#FFFFFF',
  text: '#2D3748',
  textSecondary: '#718096',
  textLight: '#A0AEC0',
  border: '#E2E8F0',
  red: '#C05B5B',
  green: '#6B8F71',
  greenDark: '#5A7D60',
  gold: '#D69E2E',
  white: '#FFFFFF',
};

export const FALLBACK_CITIES: City[] = [
  { SehirID: '500', SehirAdi: 'ADANA', SehirAdiEn: 'ADANA' },
  { SehirID: '501', SehirAdi: 'ADIYAMAN', SehirAdiEn: 'ADIYAMAN' },
  { SehirID: '502', SehirAdi: 'AFYONKARAHİSAR', SehirAdiEn: 'AFYONKARAHISAR' },
  { SehirID: '503', SehirAdi: 'AĞRI', SehirAdiEn: 'AGRI' },
  { SehirID: '504', SehirAdi: 'AKSARAY', SehirAdiEn: 'AKSARAY' },
  { SehirID: '505', SehirAdi: 'AMASYA', SehirAdiEn: 'AMASYA' },
  { SehirID: '506', SehirAdi: 'ANKARA', SehirAdiEn: 'ANKARA' },
  { SehirID: '507', SehirAdi: 'ANTALYA', SehirAdiEn: 'ANTALYA' },
  { SehirID: '508', SehirAdi: 'ARDAHAN', SehirAdiEn: 'ARDAHAN' },
  { SehirID: '509', SehirAdi: 'ARTVİN', SehirAdiEn: 'ARTVIN' },
  { SehirID: '510', SehirAdi: 'AYDIN', SehirAdiEn: 'AYDIN' },
  { SehirID: '511', SehirAdi: 'BALIKESİR', SehirAdiEn: 'BALIKESIR' },
  { SehirID: '512', SehirAdi: 'BARTIN', SehirAdiEn: 'BARTIN' },
  { SehirID: '513', SehirAdi: 'BATMAN', SehirAdiEn: 'BATMAN' },
  { SehirID: '514', SehirAdi: 'BAYBURT', SehirAdiEn: 'BAYBURT' },
  { SehirID: '515', SehirAdi: 'BİLECİK', SehirAdiEn: 'BILECIK' },
  { SehirID: '516', SehirAdi: 'BİNGÖL', SehirAdiEn: 'BINGOL' },
  { SehirID: '517', SehirAdi: 'BİTLİS', SehirAdiEn: 'BITLIS' },
  { SehirID: '518', SehirAdi: 'BOLU', SehirAdiEn: 'BOLU' },
  { SehirID: '519', SehirAdi: 'BURDUR', SehirAdiEn: 'BURDUR' },
  { SehirID: '520', SehirAdi: 'BURSA', SehirAdiEn: 'BURSA' },
  { SehirID: '521', SehirAdi: 'ÇANAKKALE', SehirAdiEn: 'CANAKKALE' },
  { SehirID: '522', SehirAdi: 'ÇANKIRI', SehirAdiEn: 'CANKIRI' },
  { SehirID: '523', SehirAdi: 'ÇORUM', SehirAdiEn: 'CORUM' },
  { SehirID: '524', SehirAdi: 'DENİZLİ', SehirAdiEn: 'DENIZLI' },
  { SehirID: '525', SehirAdi: 'DİYARBAKIR', SehirAdiEn: 'DIYARBAKIR' },
  { SehirID: '526', SehirAdi: 'DÜZCE', SehirAdiEn: 'DUZCE' },
  { SehirID: '527', SehirAdi: 'EDİRNE', SehirAdiEn: 'EDIRNE' },
  { SehirID: '528', SehirAdi: 'ELAZIĞ', SehirAdiEn: 'ELAZIG' },
  { SehirID: '529', SehirAdi: 'ERZİNCAN', SehirAdiEn: 'ERZINCAN' },
  { SehirID: '530', SehirAdi: 'ERZURUM', SehirAdiEn: 'ERZURUM' },
  { SehirID: '531', SehirAdi: 'ESKİŞEHİR', SehirAdiEn: 'ESKISEHIR' },
  { SehirID: '532', SehirAdi: 'GAZİANTEP', SehirAdiEn: 'GAZIANTEP' },
  { SehirID: '533', SehirAdi: 'GİRESUN', SehirAdiEn: 'GIRESUN' },
  { SehirID: '534', SehirAdi: 'GÜMÜŞHANE', SehirAdiEn: 'GUMUSHANE' },
  { SehirID: '535', SehirAdi: 'HAKKARİ', SehirAdiEn: 'HAKKARI' },
  { SehirID: '536', SehirAdi: 'HATAY', SehirAdiEn: 'HATAY' },
  { SehirID: '537', SehirAdi: 'IĞDIR', SehirAdiEn: 'IGDIR' },
  { SehirID: '538', SehirAdi: 'ISPARTA', SehirAdiEn: 'ISPARTA' },
  { SehirID: '539', SehirAdi: 'İSTANBUL', SehirAdiEn: 'ISTANBUL' },
  { SehirID: '540', SehirAdi: 'İZMİR', SehirAdiEn: 'IZMIR' },
  { SehirID: '541', SehirAdi: 'KAHRAMANMARAŞ', SehirAdiEn: 'KAHRAMANMARAS' },
  { SehirID: '542', SehirAdi: 'KARABÜK', SehirAdiEn: 'KARABUK' },
  { SehirID: '543', SehirAdi: 'KARAMAN', SehirAdiEn: 'KARAMAN' },
  { SehirID: '544', SehirAdi: 'KARS', SehirAdiEn: 'KARS' },
  { SehirID: '545', SehirAdi: 'KASTAMONU', SehirAdiEn: 'KASTAMONU' },
  { SehirID: '546', SehirAdi: 'KAYSERİ', SehirAdiEn: 'KAYSERI' },
  { SehirID: '547', SehirAdi: 'KILIS', SehirAdiEn: 'KILIS' },
  { SehirID: '548', SehirAdi: 'KIRIKKALE', SehirAdiEn: 'KIRIKKALE' },
  { SehirID: '549', SehirAdi: 'KIRKLARELİ', SehirAdiEn: 'KIRKLARELI' },
  { SehirID: '550', SehirAdi: 'KIRŞEHİR', SehirAdiEn: 'KIRSEHIR' },
  { SehirID: '551', SehirAdi: 'KOCAELİ', SehirAdiEn: 'KOCAELI' },
  { SehirID: '552', SehirAdi: 'KONYA', SehirAdiEn: 'KONYA' },
  { SehirID: '553', SehirAdi: 'KÜTAHYA', SehirAdiEn: 'KUTAHYA' },
  { SehirID: '554', SehirAdi: 'MALATYA', SehirAdiEn: 'MALATYA' },
  { SehirID: '555', SehirAdi: 'MANİSA', SehirAdiEn: 'MANISA' },
  { SehirID: '556', SehirAdi: 'MARDİN', SehirAdiEn: 'MARDIN' },
  { SehirID: '557', SehirAdi: 'MERSİN', SehirAdiEn: 'MERSIN' },
  { SehirID: '558', SehirAdi: 'MUĞLA', SehirAdiEn: 'MUGLA' },
  { SehirID: '559', SehirAdi: 'MUŞ', SehirAdiEn: 'MUS' },
  { SehirID: '560', SehirAdi: 'NEVŞEHİR', SehirAdiEn: 'NEVSEHIR' },
  { SehirID: '561', SehirAdi: 'NİĞDE', SehirAdiEn: 'NIGDE' },
  { SehirID: '562', SehirAdi: 'ORDU', SehirAdiEn: 'ORDU' },
  { SehirID: '563', SehirAdi: 'OSMANİYE', SehirAdiEn: 'OSMANIYE' },
  { SehirID: '564', SehirAdi: 'RİZE', SehirAdiEn: 'RIZE' },
  { SehirID: '565', SehirAdi: 'SAKARYA', SehirAdiEn: 'SAKARYA' },
  { SehirID: '566', SehirAdi: 'SAMSUN', SehirAdiEn: 'SAMSUN' },
  { SehirID: '567', SehirAdi: 'ŞANLIURFA', SehirAdiEn: 'SANLIURFA' },
  { SehirID: '568', SehirAdi: 'SİİRT', SehirAdiEn: 'SIIRT' },
  { SehirID: '569', SehirAdi: 'SİNOP', SehirAdiEn: 'SINOP' },
  { SehirID: '570', SehirAdi: 'SİVAS', SehirAdiEn: 'SIVAS' },
  { SehirID: '571', SehirAdi: 'ŞIRNAK', SehirAdiEn: 'SIRNAK' },
  { SehirID: '572', SehirAdi: 'TEKİRDAĞ', SehirAdiEn: 'TEKIRDAG' },
  { SehirID: '573', SehirAdi: 'TOKAT', SehirAdiEn: 'TOKAT' },
  { SehirID: '574', SehirAdi: 'TRABZON', SehirAdiEn: 'TRABZON' },
  { SehirID: '575', SehirAdi: 'TUNCELİ', SehirAdiEn: 'TUNCELI' },
  { SehirID: '576', SehirAdi: 'UŞAK', SehirAdiEn: 'USAK' },
  { SehirID: '577', SehirAdi: 'VAN', SehirAdiEn: 'VAN' },
  { SehirID: '578', SehirAdi: 'YALOVA', SehirAdiEn: 'YALOVA' },
  { SehirID: '579', SehirAdi: 'YOZGAT', SehirAdiEn: 'YOZGAT' },
  { SehirID: '580', SehirAdi: 'ZONGULDAK', SehirAdiEn: 'ZONGULDAK' },
];
