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

// Rutas para obtener estadísticas por temporada o zona
// matchRouter.get('/statsAc/seasons/:contextId', (req, res) => matchController.getTeamStats({ ...req, params: { ...req.params, contextType: 'season' } }, res))
// matchRouter.get('/statsAc/zones/:contextId', (req, res) => matchController.getTeamStats({ ...req, params: { ...req.params, contextType: 'zone' } }, res))
