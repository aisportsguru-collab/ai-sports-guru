import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ensurePurchasesConfigured } from '../../src/lib/purchases';

type FallbackPlanId = 'monthly' | 'annual';

export default function PaywallScreen() {
  const router = useRouter();
  const [packages, setPackages] = useState<PurchasesPackage[] | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [selectedFallback, setSelectedFallback] = useState<FallbackPlanId>('annual');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<boolean>(false);

  useEffect(() => {
    const fetchPackages = async () => {
      setLoading(true);
      try {
        // ✅ Ensure SDK is configured before any RC calls
        await ensurePurchasesConfigured();

        const offerings = await Purchases.getOfferings();
        if (offerings.current && offerings.current.availablePackages.length > 0) {
          const available = offerings.current.availablePackages;
          setPackages(available);
          const annualPkg =
            available.find(p => p.identifier?.toLowerCase().includes('annual')) ||
            available.find(p => p.packageType === 'ANNUAL');
          setSelectedPackage(annualPkg || available[0]);
          setError(null);
        } else {
          setError('offerings_unavailable');
        }
      } catch (err: any) {
        console.error('Error fetching offerings:', err);
        setError('offerings_unavailable');
      } finally {
        setLoading(false);
      }
    };
    fetchPackages();
  }, []);

  const isFallback = useMemo(() => !packages || packages.length === 0 || !!error, [packages, error]);

  const handlePurchase = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // ✅ Guard again before purchase
    await ensurePurchasesConfigured();

    if (isFallback) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'Purchases temporarily unavailable',
        'Our in-app products are awaiting App Store approval. You can still explore the app and restore existing purchases.',
      );
      return;
    }
    if (!selectedPackage) {
      Alert.alert('Select a plan', 'Please choose Monthly or Annual to continue.');
      return;
    }
    try {
      setPurchasing(true);
      const purchaseInfo = await Purchases.purchasePackage(selectedPackage);
      if (purchaseInfo.customerInfo?.entitlements?.active?.pro) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      }
    } catch (e: any) {
      if (!e?.userCancelled) {
        console.warn('Purchase failed:', e);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Purchase Failed', e?.message || 'Something went wrong during purchase. Please try again.');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // ✅ Guard before restore
    await ensurePurchasesConfigured();

    try {
      setPurchasing(true);
      const customerInfo = await Purchases.restoreTransactions();
      if (customerInfo.entitlements?.active?.pro) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Restored', 'Your purchases have been restored successfully.');
        router.back();
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert('No Purchases', 'We did not find any past purchases on your account.');
      }
    } catch (e: any) {
      console.error('Restore failed:', e);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Restore Failed', e?.message || 'Could not restore purchases. Please try again later.');
    } finally {
      setPurchasing(false);
    }
  };

  const PlanOption = ({ pkg }: { pkg: PurchasesPackage }) => {
    const product = pkg.product;
    const isSelected = selectedPackage?.identifier === pkg.identifier;
    const identifier = pkg.identifier.toLowerCase();
    const isAnnual = identifier.includes('annual') || pkg.packageType === 'ANNUAL';
    const isMonthly = identifier.includes('month') || pkg.packageType === 'MONTHLY';
    let title = product.title || (isAnnual ? 'Annual Plan' : 'Monthly Plan');
    if (isAnnual && !title.toLowerCase().includes('annual')) title = title + ' (Annual)';
    if (isMonthly && !title.toLowerCase().includes('month')) title = title + ' (Monthly)';
    const price = product.priceString ?? `${product.price} ${product.currencyCode}`;
    let subtitle = product.description;
    if (isAnnual && packages) {
      const monthlyPkg = packages.find(p => p.identifier.toLowerCase().includes('month') || p.packageType === 'MONTHLY');
      if (monthlyPkg) {
        const perMonth = product.price / 12;
        const perMonthStr = perMonth.toLocaleString(undefined, { style: 'currency', currency: product.currencyCode });
        subtitle = `Equivalent to ${perMonthStr}/month`;
        const saveFraction = 1 - product.price / (monthlyPkg.product.price * 12);
        const savePercent = Math.round(saveFraction * 100);
        if (savePercent > 0) subtitle += ` – Save ${savePercent}%`;
      }
    }
    return (
      <TouchableOpacity
        style={[styles.planOption, isSelected && styles.planOptionSelected]}
        onPress={async () => {
          await Haptics.selectionAsync();
          setSelectedPackage(pkg);
        }}
      >
        <Text style={[styles.planTitle, isSelected && styles.planTitleSelected]}>{title}</Text>
        <Text style={[styles.planPrice, isSelected && styles.planPriceSelected]}>
          {price}{isAnnual ? '/year' : '/month'}
        </Text>
        {subtitle ? <Text style={[styles.planSubtitle, isSelected && styles.planSubtitleSelected]}>{subtitle}</Text> : null}
      </TouchableOpacity>
    );
  };

  const FallbackPlanOption = ({ id, title, price, subtitle }: { id: FallbackPlanId; title: string; price: string; subtitle?: string }) => {
    const isSelected = selectedFallback === id;
    return (
      <TouchableOpacity
        style={[styles.planOption, isSelected && styles.planOptionSelected]}
        onPress={async () => {
          await Haptics.selectionAsync();
          setSelectedFallback(id);
        }}
      >
        <Text style={[styles.planTitle, isSelected && styles.planTitleSelected]}>{title}</Text>
        <Text style={[styles.planPrice, isSelected && styles.planPriceSelected]}>{price}</Text>
        {subtitle ? <Text style={[styles.planSubtitle, isSelected && styles.planSubtitleSelected]}>{subtitle}</Text> : null}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#FFFFFF" style={{ marginTop: 100 }} />
        <Text style={styles.loadingText}>Loading offers...</Text>
      </SafeAreaView>
    );
  }

  const isFallbackUI = isFallback;

  return (
    <LinearGradient colors={['#0b0f2a', '#1e2749']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <TouchableOpacity style={styles.closeButton} onPress={async () => { await Haptics.selectionAsync(); router.back(); }}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.heroTitle}>Upgrade to Pro</Text>
          <Text style={styles.heroSubtitle}>Unlock all features and insights</Text>

          <View style={styles.bulletsContainer}>
            <Text style={styles.bulletPoint}>• Access AI-powered game predictions</Text>
            <Text style={styles.bulletPoint}>• Real-time odds updates and alerts</Text>
            <Text style={styles.bulletPoint}>• Exclusive analysis and tips</Text>
            <Text style={styles.bulletPoint}>• Ad-free, priority support</Text>
          </View>

          {isFallbackUI ? (
            <>
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  Purchases are temporarily unavailable while products finish App Store setup. You can still preview plans and restore existing purchases.
                </Text>
              </View>
              <View style={styles.plansContainer}>
                <FallbackPlanOption id="monthly" title="Monthly Plan" price="$49.99/month" />
                <FallbackPlanOption id="annual" title="Annual Plan" price="$499.99/year" subtitle="Equivalent to $41.67/month – Save 17%" />
              </View>
            </>
          ) : (
            packages && packages.length > 0 && (
              <View style={styles.plansContainer}>
                {packages.map(pkg => (
                  <PlanOption key={pkg.identifier} pkg={pkg} />
                ))}
              </View>
            )
          )}

          <TouchableOpacity
            style={[styles.subscribeButton, (purchasing || isFallbackUI) && styles.subscribeButtonDisabled]}
            onPress={handlePurchase}
            disabled={purchasing}
          >
            <Text style={styles.subscribeButtonText}>{purchasing ? 'Processing...' : isFallbackUI ? 'Purchases Unavailable' : 'Continue'}</Text>
          </TouchableOpacity>

          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={handleRestore}>
              <Text style={styles.footerLinkText}>Restore Purchases</Text>
            </TouchableOpacity>
            <Text style={styles.footerLinkText}>{"  •  "}</Text>
            <TouchableOpacity onPress={() => router.push('/(onboarding)/terms')}>
              <Text style={styles.footerLinkText}>Terms of Use</Text>
            </TouchableOpacity>
            <Text style={styles.footerLinkText}>{"  •  "}</Text>
            <TouchableOpacity onPress={() => router.push('/(public)/privacy')}>
              <Text style={styles.footerLinkText}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.footerLinkText}>{"  •  "}</Text>
            <TouchableOpacity onPress={() => router.push('/(public)/responsible')}>
              <Text style={styles.footerLinkText}>Responsible Gaming</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: 20, paddingBottom: 20 },
  scrollContainer: { paddingVertical: 20, alignItems: 'center', justifyContent: 'center' },
  closeButton: { alignSelf: 'flex-end', padding: 8 },
  closeButtonText: { fontSize: 20, color: '#ffffffaa' },
  heroTitle: { fontSize: 32, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', marginTop: 20 },
  heroSubtitle: { fontSize: 18, color: '#FFFFFFCC', textAlign: 'center', marginTop: 8, marginBottom: 20 },
  bulletsContainer: { marginBottom: 30, marginTop: 10, paddingHorizontal: 10 },
  bulletPoint: { fontSize: 16, color: '#FFFFFFCC', marginVertical: 4 },
  plansContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  planOption: { flex: 1, paddingVertical: 16, paddingHorizontal: 12, marginHorizontal: 5, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 2, borderColor: 'transparent' },
  planOptionSelected: { borderColor: '#3fc060', backgroundColor: 'rgba(63,192,96,0.2)' },
  planTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', textAlign: 'center', marginBottom: 4 },
  planTitleSelected: { color: '#3fc060' },
  planPrice: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', textAlign: 'center' },
  planPriceSelected: { color: '#3fc060' },
  planSubtitle: { fontSize: 13, color: '#FFFFFFCC', textAlign: 'center', marginTop: 2 },
  planSubtitleSelected: { color: '#A0F3BD' },
  subscribeButton: { width: '90%', backgroundColor: '#3fc060', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginTop: 10, marginBottom: 10 },
  subscribeButtonDisabled: { opacity: 0.7 },
  subscribeButtonText: { fontSize: 18, fontWeight: '600', color: '#fff' },
  footerLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, flexWrap: 'wrap' },
  footerLinkText: { fontSize: 12, color: '#FFFFFFAA', textDecorationLine: 'underline' },
  loadingText: { color: '#FFFFFF', fontSize: 16, textAlign: 'center', marginTop: 10 },
  infoBox: { backgroundColor: 'rgba(255,255,255,0.08)', padding: 10, borderRadius: 8, marginBottom: 12, width: '92%' },
  infoText: { color: '#FFFFFFCC', fontSize: 13, textAlign: 'center' },
});
