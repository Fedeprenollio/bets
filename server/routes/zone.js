import express from 'express'
import { addZoneToSeason, deleteZoneFromSeason, getZoneFromSeason, getZonesFromSeason, updateZoneInSeason } from '../controllers/zone.controller.js'

const zoneRouter = express.Router()

zoneRouter.post('/:seasonId/zones', addZoneToSeason)
zoneRouter.get('/seasons/:seasonId/zones', getZonesFromSeason)
zoneRouter.get('/seasons/:seasonId/zones/:zoneId', getZoneFromSeason)
zoneRouter.put('/seasons/:seasonId/zones/:zoneId', updateZoneInSeason)
zoneRouter.delete('/seasons/:seasonId/zones/:zoneId', deleteZoneFromSeason)

export default zoneRouter
