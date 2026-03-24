import React, { useEffect, useState } from 'react'
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useIsFocused } from '@react-navigation/native'

import * as bookcarsTypes from ':bookcars-types'
import SaleListingCard from '@/components/SaleListingCard'
import MarketplaceBottomNav from '@/components/MarketplaceBottomNav'
import * as SaleListingService from '@/services/SaleListingService'

const background = '#050505'
const panel = '#171717'
const white = '#F5F5F5'
const muted = '#8D8D8D'

const SaleListingsScreen = () => {
  const isFocused = useIsFocused()
  const { brand, category, dealer } = useLocalSearchParams<{ brand?: string, category?: string, dealer?: string }>()
  const [search, setSearch] = useState('')
  const [listings, setListings] = useState<bookcarsTypes.SaleListing[]>([])

  useEffect(() => {
    const load = async () => {
      const storedFilters = await SaleListingService.getStoredSaleFilters()
      const result = await SaleListingService.getSaleListings({
        ...storedFilters,
        ...(brand ? { brands: [brand] } : {}),
        ...(category ? { categories: [category as bookcarsTypes.SaleCategory] } : {}),
        ...(dealer ? { dealershipIds: [dealer] } : {}),
        keyword: search.trim() || storedFilters.keyword,
      }, 1, 40)
      setListings(result.rows)
    }

    if (isFocused) {
      void load()
    }
  }, [isFocused, search, brand, category, dealer])

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={background} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={22} color={white} />
          </Pressable>
          <Text style={styles.title}>Listings</Text>
          <Pressable style={styles.iconButton} onPress={() => router.push('/sale-filters')}>
            <MaterialIcons name="tune" size={22} color={white} />
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <MaterialIcons name="search" size={22} color={muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by model, brand, seller..."
            placeholderTextColor={muted}
            style={styles.searchInput}
          />
        </View>

        {listings.map((listing) => (
          <SaleListingCard
            key={listing._id}
            listing={listing}
            onPress={() => router.push({ pathname: '/sale-listing', params: { id: listing._id } })}
          />
        ))}
      </ScrollView>

      <MarketplaceBottomNav active="listings" />
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    color: white,
    fontSize: 28,
    fontWeight: '700',
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: panel,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrap: {
    height: 56,
    backgroundColor: panel,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  searchInput: {
    flex: 1,
    color: white,
    marginLeft: 10,
    fontSize: 16,
  },
})

export default SaleListingsScreen
