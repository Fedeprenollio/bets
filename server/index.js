import express from 'express'
import mongoose from 'mongoose'
import { teamRouter } from './routes/team.js'
import { matchRouter } from './routes/match.js'

const PORT = 1234
const URI = 'mongodb+srv://fedepreno:HUxtmqUJC1nqt5jw@cluster0.my6nk96.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
const app = express()

app.use(express.json())

app.get('/', (req, res) => {
  res.send('Hola')
})

app.use('/team', teamRouter)
app.use('/match', matchRouter)

mongoose.connect(URI)
  .then(() => console.log('Connected!'))
  .catch(e => console.log(e))

app.listen(PORT, () => {
  console.log(`Listening in http://localhost:${PORT}`)
})
