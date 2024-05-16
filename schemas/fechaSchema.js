import mongoose from 'mongoose'

const fechaSchema = new mongoose.Schema({
  number: String,
  season: { type: mongoose.Schema.Types.ObjectId, ref: 'Season' },
  matches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }],
  isCurrentFecha: Boolean
})

export const Fecha = mongoose.model('Fecha', fechaSchema)
