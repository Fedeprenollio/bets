import { Router } from 'express'
import { methods as authentication } from '../controllers/auth.controller'

export const userRouter = Router()

userRouter.get('/', authentication.register)
