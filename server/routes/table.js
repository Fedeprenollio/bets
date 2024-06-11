import express from 'express'
import { tablePositionController } from '../controllers/tablePositions.cotroller.js'

const tableRouter = express.Router()

// tableRouter.post('/:seasonId/zones', addZoneToSeason)

tableRouter.post('/update-position-tables', tablePositionController.updatePositionTables)

tableRouter.get('/:positionTableId', tablePositionController.getPositionTableById)
tableRouter.get('/zone/:zoneId', tablePositionController.getAllTablesByZone)

tableRouter.delete('/:positionTableId', tablePositionController.deletePositionTableById)

// tableRouter.get('/seasons/:seasonId/zones/:zoneId', getZoneFromSeason)
// tableRouter.put('/seasons/:seasonId/zones/:zoneId', updateZoneInSeason)
// tableRouter.delete('/seasons/:seasonId/zones/:zoneId', deleteZoneFromSeason)

export default tableRouter
