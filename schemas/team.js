import mongoose from 'mongoose'

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  country: String,
  logo: {
    type: String, // URL de la imagen del escudo del club
    required: false
  },
  alternateCode: {
    type: String, // Código alternativo para el equipo (teamCode del scraping)
    required: false,
    unique: true // Opcional: si deseas que este campo sea único
  }

})

export const Team = mongoose.model('Team', teamSchema)
