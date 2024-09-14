import { Router } from 'express'
import { getScraping } from '../controllers/scrape.controller.js'

export const scrapeRouter = Router()

// Obtener todas las ligas
scrapeRouter.post('/', getScraping)
