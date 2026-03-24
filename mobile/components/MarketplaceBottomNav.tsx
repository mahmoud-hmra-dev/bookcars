import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'

type MarketplaceTab = 'home' | 'dealerships' | 'listings'

interface MarketplaceBottomNavProps {
  active: MarketplaceTab
}

const accent = '#C56622'

const MarketplaceBottomNav = ({ active }: MarketplaceBottomNavProps) => (
  <View style={styles.wrapper}>
    <Pressable style={styles.item} onPress={() => router.replace('/')}>
      <MaterialIcons name="home-filled" size={24} color={active === 'home' ? '#FFFFFF' : '#6A6A6A'} />
      <Text style={[styles.label, active === 'home' && styles.activeLabel]}>Home</Text>
    </Pressable>

    <Pressable style={styles.item} onPress={() => router.replace('/dealerships')}>
      <MaterialIcons name="apartment" size={24} color={active === 'dealerships' ? '#FFFFFF' : '#6A6A6A'} />
      <Text style={[styles.label, active === 'dealerships' && styles.activeLabel]}>Dealers</Text>
    </Pressable>

    <Pressable style={styles.centerButton} onPress={() => router.replace('/sale-listings')}>
      <MaterialIcons name="view-carousel" size={26} color="#FFFFFF" />
    </Pressable>

    <Pressable style={styles.item} onPress={() => router.replace('/sale-listings')}>
      <MaterialIcons name="format-list-bulleted" size={24} color={active === 'listings' ? '#FFFFFF' : '#6A6A6A'} />
      <Text style={[styles.label, active === 'listings' && styles.activeLabel]}>Listings</Text>
    </Pressable>

    <View style={styles.item}>
      <MaterialIcons name="chat-bubble-outline" size={24} color="#6A6A6A" />
      <Text style={styles.label}>Chat</Text>
    </View>
  </View>
)

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 86,
    backgroundColor: '#090909',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 54,
  },
  centerButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    borderWidth: 4,
    borderColor: '#090909',
  },
  label: {
    color: '#6A6A6A',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  activeLabel: {
    color: '#FFFFFF',
  },
})

export default MarketplaceBottomNav
