import React, { useEffect, useState } from 'react'
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useIsFocused } from '@react-navigation/native'

import * as bookcarsTypes from ':bookcars-types'
import MarketplaceBottomNav from '@/components/MarketplaceBottomNav'
import * as SaleListingService from '@/services/SaleListingService'

const background = '#050505'
const panel = '#1A1A1A'
const white = '#F5F5F5'
const muted = '#B6B6B6'
const accent = '#C56622'

const DealershipsScreen = () => {
  const isFocused = useIsFocused()
  const [dealerships, setDealerships] = useState<bookcarsTypes.Dealership[]>([])

  useEffect(() => {
    if (isFocused) {
      void SaleListingService.getDealerships().then(setDealerships)
    }
  }, [isFocused])

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={background} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Dealerships</Text>
          <View style={styles.actions}>
            <View style={styles.action}><MaterialIcons name="search" size={22} color={white} /></View>
            <View style={styles.action}><MaterialIcons name="swap-vert" size={22} color={white} /></View>
          </View>
        </View>

        {dealerships.map((dealership) => (
          <Pressable
            key={dealership._id}
            style={styles.card}
            onPress={() => router.push({ pathname: '/sale-listings', params: { dealer: dealership._id } })}
          >
            <View style={styles.logo} />
            <View style={styles.info}>
              <Text style={styles.name}>{dealership.name}</Text>
              <View style={styles.locationRow}>
                <MaterialIcons name="location-on" size={16} color={muted} />
                <Text style={styles.location}>{dealership.location || dealership.city || ''}</Text>
              </View>
              <View style={styles.countBadge}>
                <MaterialIcons name="directions-car" size={16} color={accent} />
                <Text style={styles.countText}>{dealership.listingCount}</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <MarketplaceBottomNav active="dealerships" />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: background,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  title: {
    color: white,
    fontSize: 34,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  action: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#121826',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: panel,
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E7E7E7',
    marginRight: 16,
  },
  info: {
    flex: 1,
  },
  name: {
    color: white,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  location: {
    color: muted,
    fontSize: 17,
  },
  countBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3B2418',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  countText: {
    color: accent,
    fontSize: 16,
    fontWeight: '700',
  },
})

export default DealershipsScreen
