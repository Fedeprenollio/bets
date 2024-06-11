import express from 'express'
import mongoose from 'mongoose'
import { teamRouter } from './routes/team.js'
import { matchRouter } from './routes/match.js'
import cors from 'cors'
import morgan from 'morgan'
import { leagueRouter } from './routes/league.js'
import { seasonRouter } from './routes/season.js'
import 'dotenv/config'
import { userRouter } from './routes/users.js'
import cookieParser from 'cookie-parser'
import verifyTokenRouter from './routes/validatedToken.js'
import { standingsRouter } from './routes/standings.js'
import { fechaRouter } from './routes/fecha.js'
import tableRouter from './routes/table.js'
const URI_DB = process.env.URI_DB

const PORT = process.env.PORT || 1234
const app = express()

const corsOptions = {
  origin: ['http://localhost:5173', 'https://bet-reason.vercel.app', 'http://localhost:5174'], // Sin coma después del último elemento
  credentials: true // Habilita el envío de credenciales en las solicitudes CORS
}

app.use(cors(corsOptions))
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT')
  next()
})

app.use(express.json())
app.use(cookieParser())
app.use(morgan('tiny'))
app.get('/', (req, res) => {
  res.send('Hola')
})

app.use('/team', teamRouter)
app.use('/match', matchRouter)
app.use('/league', leagueRouter)
app.use('/season', seasonRouter)
app.use('/user', userRouter)
app.use('/standings', standingsRouter)
app.use('/fecha', fechaRouter)
app.use('/tablePosition', tableRouter)

app.use('/verify-token', verifyTokenRouter)

app.use((req, res, next) => {
  res.status(404).json({
    error: 'Not found'
  })
})
// mongoose.connect(URI)
//   .then(() => console.log('Connected!'))
//   .catch(e => console.log(e))

async function main () {
  await mongoose.connect(URI_DB, {
    serverSelectionTimeoutMS: 30000, // 30 segundos
    socketTimeoutMS: 45000 // 45 segundos
  })
}

await main().catch(err => console.log(err))

app.listen(PORT, () => {
  console.log(`Listening in http://localhost:${PORT}`)
})
