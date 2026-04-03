import React from 'react'
import { ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import SearchForm from '@/components/SearchForm'

const background = '#050505'
const panel = '#171717'
const accent = '#C56622'
const muted = '#8D8D8D'
const white = '#F5F5F5'

const HomeScreen = () => (
  <View style={styles.screen}>
    <StatusBar barStyle="light-content" backgroundColor={background} />

    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topRow}>
        <View style={styles.vehicleChip}>
          <MaterialIcons name="directions-car-filled" size={18} color={white} />
          <Text style={styles.vehicleChipText}>Car Rental</Text>
        </View>

        <View style={styles.logoDot}>
          <View style={styles.logoDotInner} />
        </View>
      </View>

      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>Find Your Perfect Rental</Text>
        <Text style={styles.heroSubtitle}>
          Browse available cars, compare prices, and book instantly with GPS tracking.
        </Text>
      </View>

      <View style={styles.rentalCard}>
        <SearchForm />
      </View>

      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>Why Choose Us</Text>
        <View style={styles.featureRow}>
          <View style={styles.featureItem}>
            <MaterialIcons name="gps-fixed" size={28} color={accent} />
            <Text style={styles.featureTitle}>GPS Tracking</Text>
            <Text style={styles.featureText}>Real-time vehicle tracking</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialIcons name="verified" size={28} color={accent} />
            <Text style={styles.featureTitle}>Trusted Fleet</Text>
            <Text style={styles.featureText}>Verified & maintained cars</Text>
          </View>
        </View>
        <View style={styles.featureRow}>
          <View style={styles.featureItem}>
            <MaterialIcons name="support-agent" size={28} color={accent} />
            <Text style={styles.featureTitle}>24/7 Support</Text>
            <Text style={styles.featureText}>Always here for you</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialIcons name="payments" size={28} color={accent} />
            <Text style={styles.featureTitle}>Best Prices</Text>
            <Text style={styles.featureText}>Competitive daily rates</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  </View>
)

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 40,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  vehicleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: panel,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  vehicleChipText: {
    color: white,
    fontSize: 16,
    fontWeight: '600',
  },
  logoDot: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#D5D1CA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: accent,
  },
  heroSection: {
    marginBottom: 24,
  },
  heroTitle: {
    color: white,
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 10,
  },
  heroSubtitle: {
    color: muted,
    fontSize: 16,
    lineHeight: 24,
  },
  rentalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
    paddingVertical: 8,
    marginBottom: 28,
  },
  featuresSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: white,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  featureItem: {
    flex: 1,
    backgroundColor: panel,
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    gap: 8,
  },
  featureTitle: {
    color: white,
    fontSize: 15,
    fontWeight: '700',
  },
  featureText: {
    color: muted,
    fontSize: 13,
    textAlign: 'center',
  },
})

export default HomeScreen
