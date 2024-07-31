import { Router } from 'express'
import { methods as matchController } from '../controllers/match.controller.js'
import { verifyToken } from '../middleware/verifyToken .js'

export const matchRouter = Router()

matchRouter.get('/stats', matchController.getAllTeamsStats)
matchRouter.get('/team/:idTeam', matchController.getMatchesByTeamId)
matchRouter.get('/statsAc/:idTeam', matchController.getTeamStats)
matchRouter.get('/', matchController.getAllMatches)
matchRouter.post('/', verifyToken, matchController.createMatch)
matchRouter.put('/:id/result', verifyToken, matchController.updateMatchResult)
matchRouter.get('/:id', matchController.getMatchById)

matchRouter.get('/team-stats/:seasonId', matchController.getTeamStatsForSeason)

matchRouter.delete('/:id', matchController.deleteMatchById)
matchRouter.put('/:id', verifyToken, matchController.updateMatchById)
