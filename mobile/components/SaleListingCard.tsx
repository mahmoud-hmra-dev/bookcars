import React from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import * as bookcarsTypes from ':bookcars-types'
import { formatSaleMileage, formatSalePrice, getConditionLabel } from '@/utils/saleListingHelper'

interface SaleListingCardProps {
  listing: bookcarsTypes.SaleListing
  onPress: () => void
}

const darkCard = '#1A1A1A'
const lightText = '#F5F5F5'
const mutedText = '#9A9A9A'
const accent = '#C56622'

const SaleListingCard = ({ listing, onPress }: SaleListingCardProps) => (
  <Pressable style={styles.card} onPress={onPress}>
    <View style={styles.imageWrapper}>
      {listing.images[0]
        ? <Image source={{ uri: listing.images[0] }} style={styles.image} resizeMode="cover" />
        : (
          <View style={styles.placeholder}>
            <MaterialIcons name="directions-car" size={42} color="#5E5E5E" />
          </View>
        )}
      <View style={styles.priceBadge}>
        <Text style={styles.priceText}>{formatSalePrice(listing.price)}</Text>
      </View>
    </View>

    <View style={styles.content}>
      <Text style={styles.title}>{listing.title}</Text>
      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <MaterialIcons name="calendar-month" size={18} color={lightText} />
          <Text style={styles.metricValue}>{listing.year}</Text>
        </View>
        <View style={styles.metric}>
          <MaterialIcons name="speed" size={18} color={lightText} />
          <Text style={styles.metricValue}>{formatSaleMileage(listing.mileage)}</Text>
        </View>
        <View style={styles.metric}>
          <MaterialIcons name="settings" size={18} color={lightText} />
          <Text style={styles.metricValue}>{listing.gearbox === bookcarsTypes.GearboxType.Automatic ? 'Automatic' : 'Manual'}</Text>
        </View>
        <View style={styles.metric}>
          <MaterialIcons name="car-repair" size={18} color={lightText} />
          <Text style={styles.metricValue}>{getConditionLabel(listing.condition)}</Text>
        </View>
      </View>

      <View style={styles.sellerRow}>
        <View style={styles.sellerIdentity}>
          <View style={styles.sellerAvatar}>
            <MaterialIcons name="person-outline" size={18} color={lightText} />
          </View>
          <View>
            <Text style={styles.sellerName}>{listing.seller.name}</Text>
            <Text style={styles.sellerLocation}>{listing.seller.location || listing.city || ''}</Text>
          </View>
        </View>
        <View style={styles.sellerActions}>
          <MaterialIcons name="call" size={18} color={lightText} />
          <MaterialIcons name="chat-bubble-outline" size={18} color={lightText} />
          <MaterialIcons name="share" size={18} color={lightText} />
        </View>
      </View>
    </View>
  </Pressable>
)

const styles = StyleSheet.create({
  card: {
    backgroundColor: darkCard,
    borderRadius: 24,
    marginBottom: 18,
    overflow: 'hidden',
  },
  imageWrapper: {
    height: 220,
    backgroundColor: '#252525',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceBadge: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    backgroundColor: '#0D0D0D',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  priceText: {
    color: accent,
    fontSize: 24,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
  },
  title: {
    color: lightText,
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  metric: {
    minWidth: '22%',
    gap: 4,
  },
  metricValue: {
    color: lightText,
    fontSize: 14,
    fontWeight: '600',
  },
  sellerRow: {
    backgroundColor: '#242424',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sellerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  sellerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#343434',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerName: {
    color: lightText,
    fontSize: 18,
    fontWeight: '700',
  },
  sellerLocation: {
    color: mutedText,
    fontSize: 14,
  },
  sellerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
})

export default SaleListingCard
