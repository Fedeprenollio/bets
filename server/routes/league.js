import { Router } from 'express'
import { leagueControllers } from '../controllers/league.controller.js'
import { validateSchema } from '../middleware/validateMiddleaware.js'
import { leagueSchema } from '../../validatedSchema/league.validated.js'
import { verifyToken } from '../middleware/verifyToken .js'

export const leagueRouter = Router()

// Obtener todas las ligas
leagueRouter.get('/', leagueControllers.getAllLeagues)

// Crear una nueva liga
leagueRouter.post('/', verifyToken, validateSchema(leagueSchema), leagueControllers.createLeague)

// Actualizar una liga
leagueRouter.put('/:id', verifyToken, leagueControllers.updateLeague)

// Eliminar una liga
leagueRouter.delete('/:id', verifyToken, leagueControllers.deleteLeague)

// Agregar un equipo a una liga
leagueRouter.post('/:id/teams', verifyToken, leagueControllers.addTeamToLeague)

// Obtener una liga por su ID
leagueRouter.get('/:id', leagueControllers.getLeagueById)
