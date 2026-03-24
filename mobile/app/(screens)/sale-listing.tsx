import React, { useEffect, useMemo, useState } from 'react'
import { Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'

import * as bookcarsTypes from ':bookcars-types'
import * as SaleListingService from '@/services/SaleListingService'
import { formatSaleMileage, formatSalePrice, getConditionLabel, getDrivetrainLabel, getSourceLabel } from '@/utils/saleListingHelper'

const background = '#050505'
const panel = '#171717'
const white = '#F5F5F5'
const muted = '#9D9D9D'
const accent = '#C56622'

const DetailRow = ({ icon, label, value }: { icon: keyof typeof MaterialIcons.glyphMap, label: string, value: string }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailLabelWrap}>
      <MaterialIcons name={icon} size={20} color={white} />
      <Text style={styles.detailLabel}>{label}</Text>
    </View>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
)

const SaleListingDetailScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [result, setResult] = useState<bookcarsTypes.SaleListingDetailResult | null>(null)
  const listing = result?.listing
  const similar = useMemo(() => result?.similar || [], [result])

  useEffect(() => {
    if (id) {
      void SaleListingService.getSaleListing(id).then(setResult)
    }
  }, [id])

  if (!listing) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" backgroundColor={background} />
        <View style={styles.emptyState}>
          <Text style={styles.title}>Listing not found</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={background} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          {listing.images[0]
            ? <Image source={{ uri: listing.images[0] }} style={styles.heroImage} resizeMode="cover" />
            : <View style={styles.heroPlaceholder}><MaterialIcons name="image" size={72} color="#6B6B6B" /></View>}

          <Pressable style={[styles.topAction, styles.topLeft]} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={white} />
          </Pressable>
          <Pressable style={[styles.topAction, styles.topRight]}>
            <MaterialIcons name="favorite-border" size={24} color={white} />
          </Pressable>

          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>{formatSalePrice(listing.price)}</Text>
          </View>
        </View>

        <Text style={styles.headline}>{listing.title}</Text>
        <Text style={styles.subhead}>Posted recently</Text>

        <Text style={styles.sectionTitle}>Technical Data</Text>
        <View style={styles.panel}>
          <DetailRow icon="speed" label="Mileage" value={formatSaleMileage(listing.mileage)} />
          <DetailRow icon="settings" label="Transmission" value={listing.gearbox === bookcarsTypes.GearboxType.Automatic ? 'Auto' : 'Manual'} />
          <DetailRow icon="car-repair" label="Drivetrain" value={getDrivetrainLabel(listing.drivetrain)} />
          <DetailRow icon="palette" label="Exterior Color" value={listing.exteriorColor} />
          <DetailRow icon="thermostat" label="Condition" value={getConditionLabel(listing.condition)} />
          <DetailRow icon="public" label="Source" value={getSourceLabel(listing.source)} />
        </View>

        {!!listing.description && (
          <>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{listing.description}</Text>
          </>
        )}

        <Text style={styles.sectionTitle}>Features</Text>
        {[
          { title: 'Technology', values: listing.features.technology },
          { title: 'Safety', values: listing.features.safety },
          { title: 'Comfort & Convenience', values: listing.features.comfort },
        ].map((group) => (
          <View key={group.title} style={styles.featureGroup}>
            <View style={styles.featureTitleRow}>
              <View style={styles.featureAccent} />
              <Text style={styles.featureTitle}>{group.title}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featureRow}>
              {group.values.map((feature) => (
                <View key={feature} style={styles.featureChip}>
                  <Text style={styles.featureChipText}>{feature}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        ))}

        {similar.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Similarly Priced Cars</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.similarRow}>
              {similar.map((item) => (
                <Pressable
                  key={item._id}
                  style={styles.similarCard}
                  onPress={() => router.replace({ pathname: '/sale-listing', params: { id: item._id } })}
                >
                  {item.images[0]
                    ? <Image source={{ uri: item.images[0] }} style={styles.similarImage} resizeMode="cover" />
                    : <View style={styles.similarPlaceholder}><MaterialIcons name="image" size={42} color="#666" /></View>}
                  <Text style={styles.similarTitle}>{item.title}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        <View style={styles.sellerBox}>
          <View style={styles.sellerIdentity}>
            <View style={styles.avatar}>
              <MaterialIcons name="person-outline" size={26} color={white} />
            </View>
            <View>
              <Text style={styles.sellerName}>{listing.seller.name}</Text>
              {!!listing.seller.badge && <Text style={styles.sellerBadge}>{listing.seller.badge}</Text>}
            </View>
          </View>
          <View style={styles.sellerActions}>
            <MaterialIcons name="call" size={22} color={white} />
            <MaterialIcons name="chat" size={22} color={white} />
            <MaterialIcons name="share" size={22} color={white} />
          </View>
        </View>

        <Pressable style={styles.mapButton}>
          <MaterialIcons name="near-me" size={22} color="#111" />
          <Text style={styles.mapButtonText}>Open in Google Maps</Text>
        </Pressable>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: background,
  },
  content: {
    paddingBottom: 40,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: white,
    fontSize: 24,
    fontWeight: '700',
  },
  hero: {
    height: 360,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
    marginBottom: 20,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topAction: {
    position: 'absolute',
    top: 52,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topLeft: {
    left: 18,
  },
  topRight: {
    right: 18,
  },
  priceBadge: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    backgroundColor: '#0B0B0B',
    paddingHorizontal: 26,
    paddingVertical: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  priceText: {
    color: accent,
    fontSize: 26,
    fontWeight: '700',
  },
  headline: {
    color: white,
    fontSize: 24,
    fontWeight: '700',
    paddingHorizontal: 18,
    marginBottom: 6,
  },
  subhead: {
    color: muted,
    fontSize: 16,
    paddingHorizontal: 18,
    marginBottom: 24,
  },
  sectionTitle: {
    color: white,
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  panel: {
    backgroundColor: panel,
    borderRadius: 20,
    marginHorizontal: 18,
    marginBottom: 24,
    paddingHorizontal: 14,
  },
  detailRow: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#343434',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailLabel: {
    color: white,
    fontSize: 18,
  },
  detailValue: {
    color: white,
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    color: white,
    fontSize: 17,
    lineHeight: 26,
    paddingHorizontal: 18,
    marginBottom: 24,
  },
  featureGroup: {
    marginBottom: 18,
  },
  featureTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  featureAccent: {
    width: 4,
    height: 22,
    borderRadius: 2,
    backgroundColor: accent,
  },
  featureTitle: {
    color: white,
    fontSize: 18,
    fontWeight: '700',
  },
  featureRow: {
    paddingHorizontal: 18,
    gap: 10,
  },
  featureChip: {
    backgroundColor: panel,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  featureChipText: {
    color: white,
    fontSize: 15,
    fontWeight: '600',
  },
  similarRow: {
    gap: 12,
    paddingHorizontal: 18,
    marginBottom: 22,
  },
  similarCard: {
    width: 190,
  },
  similarImage: {
    width: 190,
    height: 140,
    borderRadius: 18,
  },
  similarPlaceholder: {
    width: 190,
    height: 140,
    borderRadius: 18,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  similarTitle: {
    color: white,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  sellerBox: {
    marginHorizontal: 18,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sellerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1F1F1F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerName: {
    color: white,
    fontSize: 20,
    fontWeight: '700',
  },
  sellerBadge: {
    color: '#9EA4FF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  sellerActions: {
    flexDirection: 'row',
    gap: 14,
  },
  mapButton: {
    marginHorizontal: 18,
    backgroundColor: '#F6F6F6',
    borderRadius: 22,
    height: 58,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  mapButtonText: {
    color: '#111',
    fontSize: 18,
    fontWeight: '700',
  },
})

export default SaleListingDetailScreen
