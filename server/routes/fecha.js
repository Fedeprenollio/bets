import { Router } from 'express'
import { fechaController } from '../controllers/fecha.controller.js'

export const fechaRouter = Router()

// Obtener todas las ligas
fechaRouter.get('/:seasonId', fechaController.getDatesBySeason)
fechaRouter.put('/:fechaId/isCurrent', fechaController.setFechaAsCurrent)
