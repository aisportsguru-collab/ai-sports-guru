import React from 'react';
import { ScrollView, View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';

export default function TermsScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0b0f2a' }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Terms of Use</Text>
        <Text style={styles.updated}>Last updated: Aug 2025</Text>

        <Text style={styles.p}>
          Welcome to AI Sports Guru. By accessing or using the app, you agree to these Terms of Use.
          If you do not agree, do not use the app.
        </Text>

        <Text style={styles.h}>1. Informational Use Only</Text>
        <Text style={styles.p}>
          Content, including predictions, probabilities, and analyses, is provided for informational, 
          educational, and entertainment purposes only and does not constitute financial, legal, or betting advice. 
          No outcomes are guaranteed. You are solely responsible for any decisions and actions you take.
        </Text>

        <Text style={styles.h}>2. Eligibility and Local Laws</Text>
        <Text style={styles.p}>
          You are responsible for ensuring that your use complies with all applicable laws and regulations in your jurisdiction. 
          You must meet any applicable age requirements for sports wagering or related activities.
        </Text>

        <Text style={styles.h}>3. Subscriptions and Billing</Text>
        <Text style={styles.p}>
          Subscriptions are billed through the App Store using in-app purchases. Prices and terms are shown at checkout.
          Manage or cancel your subscription via your Apple ID settings. Partial periods are not refunded once started.
        </Text>

        <Text style={styles.h}>4. No Warranty</Text>
        <Text style={styles.p}>
          The app and its content are provided “as is” without warranties of any kind. We do not guarantee accuracy, timeliness, or availability.
        </Text>

        <Text style={styles.h}>5. Limitation of Liability</Text>
        <Text style={styles.p}>
          To the maximum extent permitted by law, AI Sports Guru and its affiliates are not liable for any indirect, incidental, special, 
          consequential, or punitive damages, or any loss of profits or revenues, arising from your use of the app or content.
        </Text>

        <Text style={styles.h}>6. Responsible Use</Text>
        <Text style={styles.p}>
          Engage responsibly. If you choose to wager, only do so within your means. If wagering is permitted in your jurisdiction, 
          consider setting personal limits. For help and resources, see the Responsible Gaming page.
        </Text>

        <Text style={styles.h}>7. Privacy</Text>
        <Text style={styles.p}>
          Your use of the app is also governed by our Privacy Policy describing how we collect, use, and protect data.
        </Text>

        <Text style={styles.h}>8. Changes</Text>
        <Text style={styles.p}>
          We may update these Terms from time to time. Continued use after changes indicates acceptance of the updated Terms.
        </Text>

        <Text style={styles.h}>Contact</Text>
        <Text style={styles.p}>
          For questions about these Terms, contact support at support@aisportsguru.com.
        </Text>

        <View style={{ height: 24 }} />
        <Text onPress={() => router.back()} style={styles.link}>← Back</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { color: '#fff', fontSize: 28, fontWeight: '700' },
  updated: { color: '#FFFFFF88', marginVertical: 6 },
  h: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 18, marginBottom: 6 },
  p: { color: '#FFFFFFCC', fontSize: 14, lineHeight: 20 },
  link: { color: '#7fdca5', textDecorationLine: 'underline', fontSize: 16 },
});
