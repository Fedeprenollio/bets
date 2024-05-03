import { Router } from 'express'
import { leagueControllers } from '../controllers/league.controller.js'
import { validateSchema } from '../middleware/validateMiddleaware.js'
import { leagueSchema } from '../../validatedSchema/league.validated.js'

export const leagueRouter = Router()

// Obtener todas las ligas
leagueRouter.get('/', leagueControllers.getAllLeagues)

// Crear una nueva liga
leagueRouter.post('/', validateSchema(leagueSchema), leagueControllers.createLeague)

// Actualizar una liga
leagueRouter.put('/:id', leagueControllers.updateLeague)

// Eliminar una liga
leagueRouter.delete('/:id', leagueControllers.deleteLeague)

// Agregar un equipo a una liga
leagueRouter.post('/:id/teams', leagueControllers.addTeamToLeague)

// Obtener una liga por su ID
leagueRouter.get('/:id', leagueControllers.getLeagueById)
