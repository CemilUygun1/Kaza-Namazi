import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import {
  THEME, UserProfile, Counts, DEFAULT_COUNTS, LocationData,
  City, District, PRAYERS,
} from '../constants';
import { getCities, getDistricts, getCityNameEn } from '../api';
import { Storage } from '../storage';

type Props = {
  onComplete: (profile: UserProfile, counts: Counts, location: LocationData) => void;
};

type Mode = 'welcome' | 'wizard' | 'manual' | 'location' | 'result';

export default function OnboardingScreen({ onComplete }: Props) {
  const [mode, setMode] = useState<Mode>('welcome');
  const [step, setStep] = useState(0);

  // wizard state
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [birthYear, setBirthYear] = useState(1990);
  const [pubertyAge, setPubertyAge] = useState(12);
  const [startedPrayingYear, setStartedPrayingYear] = useState<number | null>(null);
  const [neverPrayed, setNeverPrayed] = useState(false);
  const [menstruationDays, setMenstruationDays] = useState(7);
  const [includeVitir, setIncludeVitir] = useState(true);
  const [calculatedCounts, setCalculatedCounts] = useState<Counts>(DEFAULT_COUNTS);

  // location state - sync from static data
  const [cities] = useState<City[]>(() => getCities());
  const [districts, setDistricts] = useState<District[]>(() => getDistricts('539'));
  const [selectedCityId, setSelectedCityId] = useState('539'); // İstanbul
  const [selectedDistrictName, setSelectedDistrictName] = useState(() => {
    const d = getDistricts('539');
    return d.length > 0 ? d[0].IlceAdi : '';
  });

  // manual counts
  const [manualCounts, setManualCounts] = useState<Counts>({ ...DEFAULT_COUNTS });

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (gender === 'female') setPubertyAge(9);
    else setPubertyAge(12);
  }, [gender]);

  useEffect(() => {
    if (selectedCityId) {
      const d = getDistricts(selectedCityId);
      setDistricts(d);
      setSelectedDistrictName(d.length > 0 ? d[0].IlceAdi : '');
    }
  }, [selectedCityId]);

  const calculate = () => {
    const pubertyYear = birthYear + pubertyAge;
    const endYear = neverPrayed || !startedPrayingYear ? currentYear : startedPrayingYear;
    const debtYears = Math.max(0, endYear - pubertyYear);
    const totalDays = debtYears * 365;
    let prayerDays = totalDays;
    if (gender === 'female') {
      prayerDays = totalDays - (menstruationDays * 12 * debtYears);
    }
    prayerDays = Math.max(0, prayerDays);
    const counts: Counts = {
      sabah: prayerDays,
      ogle: prayerDays,
      ikindi: prayerDays,
      aksam: prayerDays,
      yatsi: prayerDays,
      vitir: includeVitir ? prayerDays : 0,
    };
    setCalculatedCounts(counts);
  };

  const handleFinish = (counts: Counts) => {
    const district = districts.find((d) => d.IlceAdi === selectedDistrictName);
    const cityNameEn = getCityNameEn(selectedCityId);
    const profile: UserProfile = {
      gender,
      birthYear,
      pubertyAge,
      startedPrayingYear: neverPrayed ? null : startedPrayingYear,
      menstruationDays: gender === 'female' ? menstruationDays : 0,
      includeVitir,
      onboardingComplete: true,
    };
    const location: LocationData = {
      cityId: selectedCityId,
      cityName: cityNameEn,
      districtId: district?.IlceID || '',
      districtName: district?.IlceAdi || '',
    };
    onComplete(profile, counts, location);
  };

  const totalCalc = Object.values(calculatedCounts).reduce((a, b) => a + b, 0);
  const totalManual = Object.values(manualCounts).reduce((a, b) => a + b, 0);

  // WELCOME
  if (mode === 'welcome') {
    return (
      <ScrollView style={s.container} contentContainerStyle={s.center}>
        <View style={s.welcomeIcon}>
          <Text style={{ fontSize: 60 }}>🕌</Text>
        </View>
        <Text style={s.welcomeTitle}>Kaza Namazı Takip</Text>
        <Text style={s.welcomeDesc}>
          Namaz kaza borcunu en doğru şekilde belirlemek için iki seçeneğin var.
        </Text>

        <Pressable
          style={[s.optionBtn, s.optionPrimary]}
          onPress={() => { setMode('wizard'); setStep(0); }}
        >
          <Text style={s.optionIcon}>🧮</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.optionTitle}>Hesaplama Sihirbazı</Text>
            <Text style={s.optionSubtitle}>
              Sadece birkaç soruyla borcunu öğrenip kaza takibine başla
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={[s.optionBtn, s.optionSecondary]}
          onPress={() => setMode('manual')}
        >
          <Text style={s.optionIcon}>✏️</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.optionTitle, { color: THEME.text }]}>Manuel Giriş</Text>
            <Text style={s.optionSubtitle}>
              Kayıtlarını manuel girerek hemen başla
            </Text>
          </View>
        </Pressable>
      </ScrollView>
    );
  }

  // MANUAL
  if (mode === 'manual') {
    return (
      <ScrollView style={s.container} contentContainerStyle={s.scrollPad}>
        <Text style={s.stepTitle}>Manuel Kaza Borcu Girişi</Text>
        <Text style={s.stepDesc}>Her namaz için toplam kaza borcunuzu girin</Text>

        {PRAYERS.map((p) => (
          <View key={p.key} style={s.manualRow}>
            <Text style={s.manualLabel}>{p.label}</Text>
            <View style={s.manualControls}>
              <Pressable
                style={[s.roundBtn, { backgroundColor: THEME.red }]}
                onPress={() => setManualCounts((c) => ({
                  ...c, [p.key]: Math.max(0, c[p.key] - 10),
                }))}
              >
                <Text style={s.roundBtnText}>-10</Text>
              </Pressable>
              <Pressable
                style={[s.roundBtn, { backgroundColor: THEME.red }]}
                onPress={() => setManualCounts((c) => ({
                  ...c, [p.key]: Math.max(0, c[p.key] - 1),
                }))}
              >
                <Text style={s.roundBtnText}>-</Text>
              </Pressable>
              <View style={s.countBox}>
                <Text style={s.countNum}>{manualCounts[p.key]}</Text>
              </View>
              <Pressable
                style={[s.roundBtn, { backgroundColor: THEME.primary }]}
                onPress={() => setManualCounts((c) => ({
                  ...c, [p.key]: c[p.key] + 1,
                }))}
              >
                <Text style={s.roundBtnText}>+</Text>
              </Pressable>
              <Pressable
                style={[s.roundBtn, { backgroundColor: THEME.primary }]}
                onPress={() => setManualCounts((c) => ({
                  ...c, [p.key]: c[p.key] + 10,
                }))}
              >
                <Text style={s.roundBtnText}>+10</Text>
              </Pressable>
            </View>
          </View>
        ))}

        <Text style={s.totalText}>Toplam Borç: {totalManual}</Text>
        <Pressable style={s.nextBtn} onPress={() => setMode('location')}>
          <Text style={s.nextBtnText}>Devam → Konum Seç</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // LOCATION
  if (mode === 'location') {
    const isFromWizard = calculatedCounts.sabah > 0 || mode === 'location';
    return (
      <ScrollView style={s.container} contentContainerStyle={s.scrollPad}>
        <Text style={s.stepTitle}>📍 Konumunuzu Seçin</Text>
        <Text style={s.stepDesc}>
          Diyanet namaz vakitlerini il ve ilçenize göre çekeceğiz
        </Text>

        <Text style={s.pickerLabel}>İl Seçin</Text>
        <View style={s.pickerWrap}>
          <Picker
            selectedValue={selectedCityId}
            onValueChange={(v) => setSelectedCityId(String(v))}
            style={s.picker}
          >
            {cities.map((c) => (
              <Picker.Item
                key={c.SehirID}
                label={c.SehirAdi}
                value={c.SehirID}
              />
            ))}
          </Picker>
        </View>

        <Text style={s.pickerLabel}>İlçe Seçin</Text>
        <View style={s.pickerWrap}>
          {districts.length === 0 ? (
            <Text style={s.noData}>İlçe bulunamadı</Text>
          ) : (
            <Picker
              selectedValue={selectedDistrictName}
              onValueChange={(v) => setSelectedDistrictName(String(v))}
              style={s.picker}
            >
              {districts.map((d, i) => (
                <Picker.Item
                  key={`${d.IlceID}_${i}`}
                  label={d.IlceAdi}
                  value={d.IlceAdi}
                />
              ))}
            </Picker>
          )}
        </View>

        <Pressable
          style={s.nextBtn}
          onPress={() => {
            const counts = calculatedCounts.sabah > 0 ? calculatedCounts : manualCounts;
            handleFinish(counts);
          }}
        >
          <Text style={s.nextBtnText}>Başla 🚀</Text>
        </Pressable>

        <Pressable style={s.backBtn} onPress={() => {
          setMode(calculatedCounts.sabah > 0 ? 'result' : 'manual');
        }}>
          <Text style={s.backBtnText}>← Geri</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // RESULT (after wizard calculation)
  if (mode === 'result') {
    return (
      <ScrollView style={s.container} contentContainerStyle={s.scrollPad}>
        <Text style={s.stepTitle}>📋 Tahmini Kaza Borcunuz</Text>
        <Text style={s.stepDesc}>
          Bu hesaplama tahminidir, isterseniz değerleri düzenleyebilirsiniz.
        </Text>

        {PRAYERS.map((p) => (
          <View key={p.key} style={s.resultRow}>
            <Text style={s.resultLabel}>{p.label}</Text>
            <Text style={s.resultValue}>{calculatedCounts[p.key].toLocaleString('tr-TR')}</Text>
          </View>
        ))}
        <View style={[s.resultRow, { backgroundColor: THEME.primaryVeryLight }]}>
          <Text style={[s.resultLabel, { fontWeight: '800' }]}>Toplam</Text>
          <Text style={[s.resultValue, { fontWeight: '900', fontSize: 22 }]}>
            {totalCalc.toLocaleString('tr-TR')}
          </Text>
        </View>

        <Pressable style={s.nextBtn} onPress={() => setMode('location')}>
          <Text style={s.nextBtnText}>Devam → Konum Seç</Text>
        </Pressable>
        <Pressable style={s.backBtn} onPress={() => setStep(gender === 'female' ? 4 : 3)}>
          <Text style={s.backBtnText}>← Düzenle</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // WIZARD STEPS
  const wizardSteps = () => {
    const pubertyYear = birthYear + pubertyAge;
    switch (step) {
      case 0: // Gender
        return (
          <>
            <Text style={s.stepTitle}>Cinsiyetiniz</Text>
            <Text style={s.stepDesc}>Hesaplama kadınlar için âdet günlerini çıkarır</Text>
            <View style={s.optionRow}>
              <Pressable
                style={[s.genderBtn, gender === 'male' && s.genderActive]}
                onPress={() => setGender('male')}
              >
                <Text style={{ fontSize: 40 }}>👨</Text>
                <Text style={[s.genderLabel, gender === 'male' && s.genderLabelActive]}>
                  Erkek
                </Text>
              </Pressable>
              <Pressable
                style={[s.genderBtn, gender === 'female' && s.genderActive]}
                onPress={() => setGender('female')}
              >
                <Text style={{ fontSize: 40 }}>👩</Text>
                <Text style={[s.genderLabel, gender === 'female' && s.genderLabelActive]}>
                  Kadın
                </Text>
              </Pressable>
            </View>
          </>
        );

      case 1: // Birth Year
        return (
          <>
            <Text style={s.stepTitle}>Doğum Yılınız</Text>
            <Text style={s.stepDesc}>Kaza borcu hesabı için gereklidir</Text>
            <View style={s.pickerWrap}>
              <Picker
                selectedValue={birthYear}
                onValueChange={(v) => setBirthYear(Number(v))}
                style={s.picker}
              >
                {Array.from({ length: 70 }, (_, i) => currentYear - 10 - i).map((y) => (
                  <Picker.Item key={y} label={String(y)} value={y} />
                ))}
              </Picker>
            </View>
            <Text style={s.infoText}>Seçilen: {birthYear}</Text>
          </>
        );

      case 2: // Puberty Age
        return (
          <>
            <Text style={s.stepTitle}>Buluğ Çağı Yaşınız</Text>
            <Text style={s.stepDesc}>
              Tahmini buluğ yaşınız ({gender === 'male' ? 'Erkek varsayılan: 12' : 'Kadın varsayılan: 9'})
            </Text>
            <View style={s.pickerWrap}>
              <Picker
                selectedValue={pubertyAge}
                onValueChange={(v) => setPubertyAge(Number(v))}
                style={s.picker}
              >
                {[8, 9, 10, 11, 12, 13, 14, 15, 16].map((a) => (
                  <Picker.Item key={a} label={`${a} yaş`} value={a} />
                ))}
              </Picker>
            </View>
            <Text style={s.infoText}>Buluğ yılı: {birthYear + pubertyAge}</Text>
          </>
        );

      case 3: // Started Praying
        return (
          <>
            <Text style={s.stepTitle}>Düzenli Namaza Başladığınız Yıl</Text>
            <Text style={s.stepDesc}>Ne zamandan beri düzenli namaz kılıyorsunuz?</Text>
            <Pressable
              style={[s.checkRow, neverPrayed && s.checkActive]}
              onPress={() => {
                setNeverPrayed(!neverPrayed);
                if (!neverPrayed) setStartedPrayingYear(null);
              }}
            >
              <Text style={s.checkIcon}>{neverPrayed ? '☑️' : '⬜'}</Text>
              <Text style={s.checkText}>Henüz düzenli kılmıyorum</Text>
            </Pressable>
            {!neverPrayed && (
              <View style={s.pickerWrap}>
                <Picker
                  selectedValue={startedPrayingYear || currentYear}
                  onValueChange={(v) => setStartedPrayingYear(Number(v))}
                  style={s.picker}
                >
                  {Array.from(
                    { length: currentYear - pubertyYear + 1 },
                    (_, i) => pubertyYear + i,
                  ).map((y) => (
                    <Picker.Item key={y} label={String(y)} value={y} />
                  ))}
                </Picker>
              </View>
            )}
            {!neverPrayed && startedPrayingYear && (
              <Text style={s.infoText}>
                Tahmini borç süresi: {startedPrayingYear - pubertyYear} yıl
              </Text>
            )}
          </>
        );

      case 4: // Menstruation (women only)
        return (
          <>
            <Text style={s.stepTitle}>Aylık Âdet Günü Sayısı</Text>
            <Text style={s.stepDesc}>Ortalama kaç gün? (Bu günler borçtan düşülecek)</Text>
            <View style={s.pickerWrap}>
              <Picker
                selectedValue={menstruationDays}
                onValueChange={(v) => setMenstruationDays(Number(v))}
                style={s.picker}
              >
                {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((d) => (
                  <Picker.Item key={d} label={`${d} gün`} value={d} />
                ))}
              </Picker>
            </View>
          </>
        );

      case 5: // Vitr
        return (
          <>
            <Text style={s.stepTitle}>Vitir Namazı</Text>
            <Text style={s.stepDesc}>
              Hanefi mezhebine göre vitir namazı vaciptir. Dahil etmek ister misiniz?
            </Text>
            <View style={s.optionRow}>
              <Pressable
                style={[s.genderBtn, includeVitir && s.genderActive]}
                onPress={() => setIncludeVitir(true)}
              >
                <Text style={{ fontSize: 32 }}>✅</Text>
                <Text style={[s.genderLabel, includeVitir && s.genderLabelActive]}>
                  Evet, Dahil Et
                </Text>
              </Pressable>
              <Pressable
                style={[s.genderBtn, !includeVitir && s.genderActive]}
                onPress={() => setIncludeVitir(false)}
              >
                <Text style={{ fontSize: 32 }}>❌</Text>
                <Text style={[s.genderLabel, !includeVitir && s.genderLabelActive]}>
                  Hayır
                </Text>
              </Pressable>
            </View>
          </>
        );

      default:
        return null;
    }
  };

  const maxStep = gender === 'female' ? 5 : 4;
  // skip menstruation step for males
  const getNextStep = () => {
    if (step === 3 && gender === 'male') return 5; // skip 4 (menstruation)
    return step + 1;
  };
  const getPrevStep = () => {
    if (step === 5 && gender === 'male') return 3; // skip 4
    return step - 1;
  };

  const isLastStep = (gender === 'male' && step === 5) || (gender === 'female' && step === 5);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scrollPad}>
      {/* Progress */}
      <View style={s.progressRow}>
        {Array.from({ length: maxStep + 1 }, (_, i) => (
          <View
            key={i}
            style={[s.progressDot, i <= step && s.progressDotActive]}
          />
        ))}
      </View>

      {wizardSteps()}

      <View style={s.navRow}>
        {step > 0 && (
          <Pressable style={s.backBtn} onPress={() => setStep(getPrevStep())}>
            <Text style={s.backBtnText}>← Geri</Text>
          </Pressable>
        )}
        {step === 0 && (
          <Pressable style={s.backBtn} onPress={() => setMode('welcome')}>
            <Text style={s.backBtnText}>← Ana Menü</Text>
          </Pressable>
        )}
        <Pressable
          style={s.nextBtn}
          onPress={() => {
            if (isLastStep) {
              calculate();
              setMode('result');
            } else {
              setStep(getNextStep());
            }
          }}
        >
          <Text style={s.nextBtnText}>{isLastStep ? 'Hesapla' : 'Devam →'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  center: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  scrollPad: { padding: 24, paddingBottom: 60 },

  welcomeIcon: { alignItems: 'center', marginBottom: 16 },
  welcomeTitle: {
    fontSize: 28, fontWeight: '800', color: THEME.text, textAlign: 'center', marginBottom: 12,
  },
  welcomeDesc: {
    fontSize: 15, color: THEME.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32,
  },

  optionBtn: {
    flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 16,
    marginBottom: 14, gap: 14, borderWidth: 1,
  },
  optionPrimary: {
    backgroundColor: THEME.primary, borderColor: THEME.primaryDark,
  },
  optionSecondary: {
    backgroundColor: THEME.white, borderColor: THEME.border,
  },
  optionIcon: { fontSize: 32 },
  optionTitle: { fontSize: 17, fontWeight: '700', color: THEME.white, marginBottom: 4 },
  optionSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 18 },

  progressRow: { flexDirection: 'row', gap: 8, marginBottom: 28, justifyContent: 'center' },
  progressDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: THEME.border,
  },
  progressDotActive: { backgroundColor: THEME.primary },

  stepTitle: {
    fontSize: 22, fontWeight: '800', color: THEME.text, marginBottom: 8,
  },
  stepDesc: {
    fontSize: 14, color: THEME.textSecondary, marginBottom: 20, lineHeight: 20,
  },

  optionRow: { flexDirection: 'row', gap: 14, marginBottom: 20 },
  genderBtn: {
    flex: 1, alignItems: 'center', padding: 20, borderRadius: 16,
    backgroundColor: THEME.white, borderWidth: 2, borderColor: THEME.border,
  },
  genderActive: {
    borderColor: THEME.primary, backgroundColor: THEME.primaryVeryLight,
  },
  genderLabel: { fontSize: 16, fontWeight: '700', color: THEME.textSecondary, marginTop: 8 },
  genderLabelActive: { color: THEME.primary },

  pickerWrap: {
    backgroundColor: THEME.white, borderRadius: 14, borderWidth: 1,
    borderColor: THEME.border, overflow: 'hidden', marginBottom: 12, minHeight: 50,
    justifyContent: 'center',
  },
  picker: { color: THEME.text },
  pickerLabel: {
    fontSize: 14, fontWeight: '700', color: THEME.text, marginBottom: 6, marginTop: 8,
  },
  noData: { padding: 14, color: THEME.textSecondary, textAlign: 'center' },

  infoText: {
    fontSize: 13, color: THEME.primary, fontWeight: '600', marginTop: 4,
  },

  checkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14,
    borderRadius: 12, backgroundColor: THEME.white, borderWidth: 1,
    borderColor: THEME.border, marginBottom: 14,
  },
  checkActive: { borderColor: THEME.primary, backgroundColor: THEME.primaryVeryLight },
  checkIcon: { fontSize: 20 },
  checkText: { fontSize: 15, fontWeight: '600', color: THEME.text },

  manualRow: {
    backgroundColor: THEME.white, borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: THEME.border,
  },
  manualLabel: { fontSize: 16, fontWeight: '700', color: THEME.text, marginBottom: 8 },
  manualControls: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  roundBtn: {
    width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  roundBtnText: { color: THEME.white, fontWeight: '800', fontSize: 16 },
  countBox: {
    minWidth: 60, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: THEME.primaryVeryLight, paddingHorizontal: 10,
  },
  countNum: { fontSize: 18, fontWeight: '800', color: THEME.text },

  totalText: {
    fontSize: 18, fontWeight: '800', color: THEME.primary, textAlign: 'center',
    marginVertical: 16,
  },

  resultRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: THEME.white, borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: THEME.border,
  },
  resultLabel: { fontSize: 16, fontWeight: '600', color: THEME.text },
  resultValue: { fontSize: 18, fontWeight: '800', color: THEME.primary },

  navRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  nextBtn: {
    flex: 1, backgroundColor: THEME.primary, paddingVertical: 16, borderRadius: 14,
    alignItems: 'center',
  },
  nextBtnText: { color: THEME.white, fontWeight: '800', fontSize: 16 },
  backBtn: {
    paddingVertical: 16, paddingHorizontal: 20, borderRadius: 14,
    alignItems: 'center', backgroundColor: THEME.white, borderWidth: 1,
    borderColor: THEME.border,
  },
  backBtnText: { color: THEME.textSecondary, fontWeight: '700', fontSize: 15 },
});
