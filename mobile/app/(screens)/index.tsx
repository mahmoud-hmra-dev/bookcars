import React, { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useIsFocused } from '@react-navigation/native'

import * as bookcarsTypes from ':bookcars-types'
import * as SaleListingService from '@/services/SaleListingService'
import SearchForm from '@/components/SearchForm'
import SaleListingCard from '@/components/SaleListingCard'
import MarketplaceBottomNav from '@/components/MarketplaceBottomNav'
import { getSaleCategoryLabel, saleCategories } from '@/utils/saleListingHelper'

const background = '#050505'
const panel = '#171717'
const panelSoft = '#111111'
const accent = '#C56622'
const muted = '#8D8D8D'
const white = '#F5F5F5'

const HomeScreen = () => {
  const isFocused = useIsFocused()
  const [activeMode, setActiveMode] = useState<'buy' | 'rent'>('buy')
  const [search, setSearch] = useState('')
  const [brands, setBrands] = useState<Array<{ name: string, count: number }>>([])
  const [listings, setListings] = useState<bookcarsTypes.SaleListing[]>([])

  const visibleListings = useMemo(() => listings.slice(0, 4), [listings])
  const heroListing = visibleListings[0]

  useEffect(() => {
    const load = async () => {
      const [storedFilters, brandRows] = await Promise.all([
        SaleListingService.getStoredSaleFilters(),
        SaleListingService.getSaleBrands(),
      ])

      const listingResult = await SaleListingService.getSaleListings({
        ...storedFilters,
        keyword: search.trim() || storedFilters.keyword,
      }, 1, 12)

      setBrands(brandRows)
      setListings(listingResult.rows)
    }

    if (isFocused) {
      void load()
    }
  }, [isFocused, search])

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={background} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topRow}>
          <Pressable style={styles.vehicleChip}>
            <MaterialIcons name="directions-car-filled" size={18} color={white} />
            <Text style={styles.vehicleChipText}>Cars</Text>
            <MaterialIcons name="keyboard-arrow-down" size={18} color={white} />
          </Pressable>

          <View style={styles.logoDot}>
            <View style={styles.logoDotInner} />
          </View>

          <Pressable style={styles.profileButton}>
            <MaterialIcons name="person" size={24} color="#121212" />
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <MaterialIcons name="search" size={24} color={muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search favorites..."
              placeholderTextColor={muted}
              style={styles.searchInput}
            />
          </View>
          <Pressable style={styles.searchAction} onPress={() => router.push('/sale-filters')}>
            <MaterialIcons name="tune" size={22} color="#131313" />
          </Pressable>
        </View>

        <View style={styles.modeTabs}>
          <Pressable style={styles.modeTab} onPress={() => setActiveMode('buy')}>
            <Text style={[styles.modeText, activeMode === 'buy' && styles.modeTextActive]}>Buy</Text>
            {activeMode === 'buy' && <View style={styles.modeUnderline} />}
          </Pressable>
          <Pressable style={styles.modeTab} onPress={() => setActiveMode('rent')}>
            <Text style={[styles.modeText, activeMode === 'rent' && styles.modeTextActive]}>Rent</Text>
            {activeMode === 'rent' && <View style={styles.modeUnderline} />}
          </Pressable>
        </View>

        {activeMode === 'buy'
          ? (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Explore by Brands</Text>
                <Pressable onPress={() => router.push('/sale-listings')}>
                  <Text style={styles.linkText}>View All</Text>
                </Pressable>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brandRow}>
                {brands.map((brand) => (
                  <Pressable
                    key={brand.name}
                    style={styles.brandItem}
                    onPress={() => router.push({ pathname: '/sale-listings', params: { brand: brand.name } })}
                  >
                    <View style={styles.brandLogo}><Text style={styles.brandLogoText}>{brand.name.slice(0, 1)}</Text></View>
                    <Text style={styles.brandName}>{brand.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                {saleCategories.map((category) => (
                  <Pressable
                    key={category}
                    style={styles.categoryChip}
                    onPress={() => router.push({ pathname: '/sale-listings', params: { category } })}
                  >
                    <Text style={styles.categoryChipText}>{getSaleCategoryLabel(category)}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              {heroListing && (
                <Pressable style={styles.heroCard} onPress={() => router.push({ pathname: '/sale-listing', params: { id: heroListing._id } })}>
                  <Text style={styles.heroBrand}>{heroListing.brand.toUpperCase()}</Text>
                  <Text style={styles.heroTitle}>{heroListing.title}</Text>
                  <Text style={styles.heroSubtitle}>{heroListing.description}</Text>
                </Pressable>
              )}

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Featured Listings</Text>
                <Pressable onPress={() => router.push('/sale-listings')}>
                  <Text style={styles.linkText}>View All</Text>
                </Pressable>
              </View>

              {visibleListings.map((listing) => (
                <SaleListingCard
                  key={listing._id}
                  listing={listing}
                  onPress={() => router.push({ pathname: '/sale-listing', params: { id: listing._id } })}
                />
              ))}
            </>
            )
          : (
            <View style={styles.rentPanel}>
              <Text style={styles.sectionTitle}>Rental Search</Text>
              <Text style={styles.sectionSubtitle}>
                The original booking flow is still available. Use it when the user wants to rent instead of buy.
              </Text>
              <View style={styles.rentCard}>
                <SearchForm />
              </View>
            </View>
            )}
      </ScrollView>

      <MarketplaceBottomNav active="home" />
    </View>
  )
}

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
    paddingBottom: 120,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
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
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 26,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: panel,
    borderRadius: 22,
    paddingHorizontal: 16,
    height: 58,
  },
  searchInput: {
    flex: 1,
    color: white,
    marginLeft: 10,
    fontSize: 17,
  },
  searchAction: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  modeTab: {
    flex: 1,
    paddingBottom: 10,
  },
  modeText: {
    color: '#555555',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  modeTextActive: {
    color: white,
  },
  modeUnderline: {
    marginTop: 10,
    height: 3,
    borderRadius: 2,
    backgroundColor: accent,
    marginHorizontal: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    color: white,
    fontSize: 22,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: muted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  linkText: {
    color: '#D08B5C',
    fontSize: 16,
    fontWeight: '600',
  },
  brandRow: {
    gap: 20,
    paddingBottom: 20,
  },
  brandItem: {
    width: 88,
    alignItems: 'center',
    gap: 10,
  },
  brandLogo: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: panelSoft,
    borderWidth: 1,
    borderColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLogoText: {
    color: white,
    fontSize: 24,
    fontWeight: '700',
  },
  brandName: {
    color: white,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '500',
  },
  categoryRow: {
    gap: 10,
    paddingBottom: 18,
  },
  categoryChip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  categoryChipText: {
    color: white,
    fontSize: 16,
    fontWeight: '600',
  },
  heroCard: {
    backgroundColor: '#151515',
    borderRadius: 28,
    padding: 24,
    marginBottom: 24,
  },
  heroBrand: {
    color: '#E7E7E7',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  heroTitle: {
    color: white,
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 10,
  },
  heroSubtitle: {
    color: muted,
    fontSize: 15,
    lineHeight: 22,
  },
  rentPanel: {
    backgroundColor: panelSoft,
    borderRadius: 24,
    padding: 18,
  },
  rentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
    paddingVertical: 8,
  },
})

export default HomeScreen
