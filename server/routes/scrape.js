import { Router } from 'express'
import { getScraping } from '../controllers/scrape.controller'

export const scrapeRouter = Router()

// Obtener todas las ligas
scrapeRouter.post('/', getScraping)
