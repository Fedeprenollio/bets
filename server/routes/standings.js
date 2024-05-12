import { Router } from 'express'
import { standingsController } from '../controllers/standings.controller.js'
export const standingsRouter = Router()

standingsRouter.get('/season/:seasonId', standingsController.getStandingsBySeason)
standingsRouter.post('/season/:seasonId', standingsController.updateStandingsForSeason)
standingsRouter.delete('/', standingsController.deleteAllStandings)

standingsRouter.get('/:seasonId/team/:teamId/stats', standingsController.getTeamStats)
standingsRouter.get('/:seasonId', standingsController.getSeasonStats
)
