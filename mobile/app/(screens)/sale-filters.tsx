import React, { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { router } from 'expo-router'

import * as bookcarsTypes from ':bookcars-types'
import * as SaleListingService from '@/services/SaleListingService'
import { colorOptions, fuelTypeOptions, getDrivetrainLabel, getFuelTypeLabel, getSourceLabel } from '@/utils/saleListingHelper'

const background = '#050505'
const tile = '#202020'
const white = '#F5F5F5'
const muted = '#989898'
const accent = '#C56622'

const FilterSection = ({ title, subtitle, children }: { title: string, subtitle: string, children: React.ReactNode }) => (
  <View style={styles.section}>
    <View style={styles.sectionAccent} />
    <Text style={styles.sectionTitle}>{title}</Text>
    <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    {children}
  </View>
)

const ToggleTile = ({
  label,
  selected,
  onPress,
}: {
  label: string
  selected: boolean
  onPress: () => void
}) => (
  <Pressable style={[styles.toggleTile, selected && styles.toggleTileActive]} onPress={onPress}>
    <Text style={[styles.toggleTileText, selected && styles.toggleTileTextActive]}>{label}</Text>
  </Pressable>
)

const SaleFiltersScreen = () => {
  const [dealerships, setDealerships] = useState<bookcarsTypes.Dealership[]>([])
  const [filters, setFilters] = useState<bookcarsTypes.SaleListingFilter>({})

  useEffect(() => {
    const load = async () => {
      const [storedFilters, rows] = await Promise.all([
        SaleListingService.getStoredSaleFilters(),
        SaleListingService.getDealerships(),
      ])
      setFilters(storedFilters)
      setDealerships(rows)
    }

    void load()
  }, [])

  const toggleValue = <T,>(key: keyof bookcarsTypes.SaleListingFilter, value: T) => {
    setFilters((prev) => {
      const current = (prev[key] as T[] | undefined) || []
      const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
      return { ...prev, [key]: next }
    })
  }

  const values = useMemo(() => ({
    minPrice: filters.minPrice?.toString() || '',
    maxPrice: filters.maxPrice?.toString() || '',
    minMileage: filters.minMileage?.toString() || '',
    maxMileage: filters.maxMileage?.toString() || '',
    minYear: filters.minYear?.toString() || '',
    maxYear: filters.maxYear?.toString() || '',
  }), [filters])

  const updateNumber = (key: keyof bookcarsTypes.SaleListingFilter, value: string) => {
    const trimmed = value.trim()
    setFilters((prev) => ({
      ...prev,
      [key]: trimmed ? Number(trimmed) : undefined,
    }))
  }

  const clearAll = async () => {
    setFilters({})
    await SaleListingService.clearStoredSaleFilters()
  }

  const applyFilters = async () => {
    await SaleListingService.setStoredSaleFilters(filters)
    router.back()
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={background} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><MaterialIcons name="close" size={28} color={white} /></Pressable>
        <Pressable onPress={clearAll}><Text style={styles.clearAll}>Clear All</Text></Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <FilterSection title="Source" subtitle="Choose vehicle origin">
          <View style={styles.grid}>
            {[bookcarsTypes.ListingSource.Gcc, bookcarsTypes.ListingSource.Company, bookcarsTypes.ListingSource.Imported].map((item) => (
              <ToggleTile
                key={item}
                label={getSourceLabel(item)}
                selected={filters.sources?.includes(item) || false}
                onPress={() => toggleValue('sources', item)}
              />
            ))}
          </View>
        </FilterSection>

        <FilterSection title="Fuel Type" subtitle="Choose vehicle fuel type">
          <View style={styles.grid}>
            {fuelTypeOptions.map((item) => (
              <ToggleTile
                key={item}
                label={getFuelTypeLabel(item)}
                selected={filters.fuelTypes?.includes(item) || false}
                onPress={() => toggleValue('fuelTypes', item)}
              />
            ))}
          </View>
        </FilterSection>

        <FilterSection title="Vehicle Color" subtitle="Choose exterior color">
          <View style={styles.colorRow}>
            {colorOptions.map((color) => {
              const selected = filters.colors?.includes(color.value) || false
              return (
                <Pressable key={color.value} style={styles.colorItem} onPress={() => toggleValue('colors', color.value)}>
                  <View style={[styles.colorSwatch, { backgroundColor: color.hex }, selected && styles.colorSwatchActive]} />
                  <Text style={styles.colorLabel}>{color.label}</Text>
                </Pressable>
              )
            })}
          </View>
        </FilterSection>

        <FilterSection title="Transmission" subtitle="Choose transmission type">
          <View style={styles.grid}>
            {[bookcarsTypes.GearboxType.Automatic, bookcarsTypes.GearboxType.Manual].map((item) => (
              <ToggleTile
                key={item}
                label={item === bookcarsTypes.GearboxType.Automatic ? 'Automatic' : 'Manual'}
                selected={filters.gearboxes?.includes(item) || false}
                onPress={() => toggleValue('gearboxes', item)}
              />
            ))}
          </View>
        </FilterSection>

        <FilterSection title="Drivetrain" subtitle="Select drivetrain configuration">
          <View style={styles.grid}>
            {[bookcarsTypes.DrivetrainType.Fwd, bookcarsTypes.DrivetrainType.Rwd, bookcarsTypes.DrivetrainType.Awd, bookcarsTypes.DrivetrainType.FourWd].map((item) => (
              <ToggleTile
                key={item}
                label={getDrivetrainLabel(item)}
                selected={filters.drivetrains?.includes(item) || false}
                onPress={() => toggleValue('drivetrains', item)}
              />
            ))}
          </View>
        </FilterSection>

        <FilterSection title="Condition" subtitle="Choose vehicle condition">
          <View style={styles.grid}>
            {[bookcarsTypes.ListingCondition.New, bookcarsTypes.ListingCondition.Used].map((item) => (
              <ToggleTile
                key={item}
                label={item === bookcarsTypes.ListingCondition.New ? 'New' : 'Used'}
                selected={filters.conditions?.includes(item) || false}
                onPress={() => toggleValue('conditions', item)}
              />
            ))}
          </View>
        </FilterSection>

        <FilterSection title="Price Range" subtitle="Set your budget range">
          <View style={styles.rangeRow}>
            <TextInput value={values.minPrice} onChangeText={(value) => updateNumber('minPrice', value)} keyboardType="numeric" placeholder="Min Price" placeholderTextColor={muted} style={styles.rangeInput} />
            <Text style={styles.rangeDash}>-</Text>
            <TextInput value={values.maxPrice} onChangeText={(value) => updateNumber('maxPrice', value)} keyboardType="numeric" placeholder="Max Price" placeholderTextColor={muted} style={styles.rangeInput} />
          </View>
        </FilterSection>

        <FilterSection title="Mileage Range" subtitle="Set mileage preferences">
          <View style={styles.rangeRow}>
            <TextInput value={values.minMileage} onChangeText={(value) => updateNumber('minMileage', value)} keyboardType="numeric" placeholder="Min Mileage" placeholderTextColor={muted} style={styles.rangeInput} />
            <Text style={styles.rangeDash}>-</Text>
            <TextInput value={values.maxMileage} onChangeText={(value) => updateNumber('maxMileage', value)} keyboardType="numeric" placeholder="Max Mileage" placeholderTextColor={muted} style={styles.rangeInput} />
          </View>
        </FilterSection>

        <FilterSection title="Year Range" subtitle="Select manufacturing year range">
          <View style={styles.rangeRow}>
            <TextInput value={values.minYear} onChangeText={(value) => updateNumber('minYear', value)} keyboardType="numeric" placeholder="Min Year" placeholderTextColor={muted} style={styles.rangeInput} />
            <Text style={styles.rangeDash}>-</Text>
            <TextInput value={values.maxYear} onChangeText={(value) => updateNumber('maxYear', value)} keyboardType="numeric" placeholder="Max Year" placeholderTextColor={muted} style={styles.rangeInput} />
          </View>
        </FilterSection>

        <FilterSection title="Dealerships" subtitle="Filter by dealerships">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dealerRow}>
            {dealerships.map((dealer) => {
              const selected = filters.dealershipIds?.includes(dealer._id) || false
              return (
                <Pressable
                  key={dealer._id}
                  style={[styles.dealerChip, selected && styles.dealerChipActive]}
                  onPress={() => toggleValue('dealershipIds', dealer._id)}
                >
                  <View style={styles.dealerLogo} />
                  <Text style={styles.dealerName}>{dealer.name}</Text>
                </Pressable>
              )
            })}
          </ScrollView>
        </FilterSection>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable style={styles.applyButton} onPress={applyFilters}>
          <Text style={styles.applyButtonText}>Apply Filters</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: background,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  clearAll: {
    color: white,
    fontSize: 18,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 120,
  },
  section: {
    marginTop: 24,
  },
  sectionAccent: {
    width: 50,
    height: 5,
    borderRadius: 3,
    backgroundColor: accent,
    marginBottom: 12,
  },
  sectionTitle: {
    color: white,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: muted,
    fontSize: 16,
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  toggleTile: {
    width: '47%',
    minHeight: 108,
    backgroundColor: tile,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  toggleTileActive: {
    borderColor: accent,
    backgroundColor: '#2A1A13',
  },
  toggleTileText: {
    color: white,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  toggleTileTextActive: {
    color: '#FFD4B6',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  colorItem: {
    alignItems: 'center',
    width: 72,
  },
  colorSwatch: {
    width: 64,
    height: 64,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginBottom: 8,
  },
  colorSwatchActive: {
    borderColor: accent,
    transform: [{ scale: 1.04 }],
  },
  colorLabel: {
    color: white,
    fontSize: 16,
    fontWeight: '600',
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rangeInput: {
    flex: 1,
    minHeight: 96,
    borderRadius: 18,
    backgroundColor: tile,
    paddingHorizontal: 18,
    color: white,
    fontSize: 18,
  },
  rangeDash: {
    color: white,
    fontSize: 24,
    fontWeight: '700',
  },
  dealerRow: {
    gap: 12,
  },
  dealerChip: {
    width: 104,
    backgroundColor: tile,
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dealerChipActive: {
    borderColor: accent,
    backgroundColor: '#2A1A13',
  },
  dealerLogo: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#F0F0F0',
    marginBottom: 8,
  },
  dealerName: {
    color: white,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: '#242424',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
  },
  applyButton: {
    height: 58,
    backgroundColor: '#64310F',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonText: {
    color: white,
    fontSize: 22,
    fontWeight: '700',
  },
})

export default SaleFiltersScreen
