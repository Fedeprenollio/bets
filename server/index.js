import express from 'express'
import mongoose from 'mongoose'
import { teamRouter } from './routes/team.js'
import { matchRouter } from './routes/match.js'
import cors from 'cors'
import morgan from 'morgan'
import { leagueRouter } from './routes/league.js'
import { seasonRouter } from './routes/season.js'

const PORT = 1234
const URI = 'mongodb+srv://fedepreno:HUxtmqUJC1nqt5jw@cluster0.my6nk96.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
const app = express()
app.use(cors())
app.use(morgan('tiny'))
app.use(express.json())
app.get('/', (req, res) => {
  res.send('Hola')
})

app.use('/team', teamRouter)
app.use('/match', matchRouter)
app.use('/league', leagueRouter)
app.use('/season', seasonRouter)

mongoose.connect(URI)
  .then(() => console.log('Connected!'))
  .catch(e => console.log(e))

app.listen(PORT, () => {
  console.log(`Listening in http://localhost:${PORT}`)
})
