import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Add, Delete, Edit } from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import * as helper from '@/utils/helper'
import Layout from '@/components/Layout'
import Pager from '@/components/Pager'
import Progress from '@/components/Progress'
import * as SaleListingService from '@/services/SaleListingService'

const SaleListings = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [rows, setRows] = useState<bookcarsTypes.SaleListing[]>([])
  const [keyword, setKeyword] = useState('')
  const [published, setPublished] = useState<'all' | 'published' | 'hidden'>('all')
  const [sellerType, setSellerType] = useState<'all' | bookcarsTypes.ListingSellerType>('all')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [rowCount, setRowCount] = useState(0)
  const [deleteId, setDeleteId] = useState('')

  const fetchData = async (_page = page) => {
    try {
      setLoading(true)
      const filter: bookcarsTypes.SaleListingFilter = {
        ...(published === 'published' ? { published: true } : {}),
        ...(published === 'hidden' ? { published: false } : {}),
        ...(sellerType !== 'all' ? { sellerTypes: [sellerType] } : {}),
      }

      const data = await SaleListingService.getSaleListings(keyword, filter, _page, env.PAGE_SIZE)
      setRows(data.rows)
      setRowCount(data.rowCount)
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      void fetchData(page)
    }
  }, [user, page, published, sellerType]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPage(1)
  }, [keyword, published, sellerType])

  const onLoad = async (_user?: bookcarsTypes.User) => {
    setUser(_user)
  }

  const handleDelete = async () => {
    try {
      const status = await SaleListingService.deleteSaleListing(deleteId)
      if (status === 200) {
        setDeleteId('')
        await fetchData(page)
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const language = user?.language || env.DEFAULT_LANGUAGE

  return (
    <Layout onLoad={onLoad} strict>
      {user && (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3, alignItems: { md: 'center' } }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>Sale Listings</Typography>
              <Typography color="text.secondary">Create, update, hide, or delete sale inventory for web and mobile.</Typography>
            </Box>
            <Button variant="contained" className="btn-primary" startIcon={<Add />} onClick={() => navigate('/create-sale-listing')}>
              New Sale Listing
            </Button>
          </Stack>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr auto' }, gap: 2, mb: 3 }}>
            <TextField
              label="Search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Title, brand, seller..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setPage(1)
                  void fetchData(1)
                }
              }}
            />

            <FormControl fullWidth>
              <InputLabel>Visibility</InputLabel>
              <Select label="Visibility" value={published} onChange={(e) => setPublished(e.target.value as 'all' | 'published' | 'hidden')}>
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="published">Published</MenuItem>
                <MenuItem value="hidden">Hidden</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Seller Type</InputLabel>
              <Select label="Seller Type" value={sellerType} onChange={(e) => setSellerType(e.target.value as 'all' | bookcarsTypes.ListingSellerType)}>
                <MenuItem value="all">All</MenuItem>
                <MenuItem value={bookcarsTypes.ListingSellerType.Dealership}>Dealership</MenuItem>
                <MenuItem value={bookcarsTypes.ListingSellerType.Private}>Private</MenuItem>
              </Select>
            </FormControl>

            <Button variant="outlined" onClick={() => void fetchData(1)}>Refresh</Button>
          </Box>

          {loading ? (
            <Progress />
          ) : rows.length > 0 ? (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, 1fr)' }, gap: 2 }}>
                {rows.map((listing) => (
                  <Card key={listing._id} variant="outlined" sx={{ borderRadius: 4 }}>
                    <CardContent>
                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        <Box
                          sx={{
                            width: { xs: '100%', md: 220 },
                            minWidth: { md: 220 },
                            height: 150,
                            borderRadius: 3,
                            backgroundImage: `url('${listing.images[0] || ''}')`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundColor: '#111',
                          }}
                        />
                        <Box sx={{ flex: 1 }}>
                          <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
                            <Chip size="small" label={listing.published ? 'Published' : 'Hidden'} color={listing.published ? 'success' : 'default'} />
                            <Chip size="small" label={listing.featured ? 'Featured' : 'Standard'} color={listing.featured ? 'warning' : 'default'} />
                            <Chip size="small" label={listing.seller.type === bookcarsTypes.ListingSellerType.Dealership ? 'Dealership' : 'Private'} />
                          </Stack>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>{listing.title}</Typography>
                          <Typography color="text.secondary" sx={{ mb: 1 }}>{listing.brand} - {listing.model} - {listing.locationLabel || listing.city || listing.seller.location || ''}</Typography>
                          <Typography sx={{ fontWeight: 700, mb: 1 }}>
                            {bookcarsHelper.formatPrice(listing.price, env.CURRENCY, language)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {listing.year} / {bookcarsHelper.formatNumber(listing.mileage, language)} km / {listing.gearbox}
                          </Typography>
                          <Stack direction="row" spacing={1}>
                            <Button startIcon={<Edit />} variant="outlined" onClick={() => navigate(`/update-sale-listing?sl=${listing._id}`)}>
                              Edit
                            </Button>
                            <Button startIcon={<Delete />} color="error" variant="outlined" onClick={() => setDeleteId(listing._id)}>
                              Delete
                            </Button>
                          </Stack>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Box>

              <Pager
                page={page}
                pageSize={env.PAGE_SIZE}
                rowCount={(page - 1) * env.PAGE_SIZE + rows.length}
                totalRecords={rowCount}
                onNext={() => setPage(page + 1)}
                onPrevious={() => setPage(page - 1)}
              />
            </>
          ) : (
            <Card variant="outlined">
              <CardContent>
                <Typography color="text.secondary">No sale listings found.</Typography>
              </CardContent>
            </Card>
          )}

          <Dialog open={!!deleteId} onClose={() => setDeleteId('')} maxWidth="xs" fullWidth>
            <DialogTitle>Delete sale listing</DialogTitle>
            <DialogContent>This action will permanently remove the selected sale listing.</DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteId('')}>Cancel</Button>
              <Button color="error" variant="contained" onClick={() => void handleDelete()}>Delete</Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}
    </Layout>
  )
}

export default SaleListings
