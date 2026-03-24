import express from 'express'
import routeNames from '../config/saleListingRoutes.config'
import authJwt from '../middlewares/authJwt'
import * as saleListingController from '../controllers/saleListingController'

const routes = express.Router()

routes.route(routeNames.createSaleListing).post(authJwt.verifyToken, authJwt.authSupplier, saleListingController.createSaleListing)
routes.route(routeNames.updateSaleListing).put(authJwt.verifyToken, authJwt.authSupplier, saleListingController.updateSaleListing)
routes.route(routeNames.deleteSaleListing).delete(authJwt.verifyToken, authJwt.authSupplier, saleListingController.deleteSaleListing)
routes.route(routeNames.getAdminSaleListings).post(authJwt.verifyToken, authJwt.authSupplier, saleListingController.getAdminSaleListings)
routes.route(routeNames.getAdminSaleListing).get(authJwt.verifyToken, authJwt.authSupplier, saleListingController.getAdminSaleListing)
routes.route(routeNames.getSaleListings).post(saleListingController.getSaleListings)
routes.route(routeNames.getSaleListing).get(saleListingController.getSaleListing)
routes.route(routeNames.getDealerships).get(saleListingController.getDealerships)
routes.route(routeNames.getBrands).get(saleListingController.getBrands)

export default routes
