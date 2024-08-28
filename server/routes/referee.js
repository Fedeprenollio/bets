import { Router } from 'express'
import { createReferee, deleteReferee, filterRefereeStatistics, getAllReferees, getRefereeById, getRefereeStatistics, updateReferee } from '../controllers/referee.js'

const refereeRouter = Router()

refereeRouter.post('/', createReferee)
refereeRouter.get('/statistics', getRefereeStatistics)
refereeRouter.get('/', getAllReferees)
refereeRouter.get('/:id', getRefereeById)
refereeRouter.put('/:id', updateReferee)
refereeRouter.delete('/:id', deleteReferee)
refereeRouter.get('/:refereeId/statistics/filter/:isHome', filterRefereeStatistics)

export default refereeRouter
