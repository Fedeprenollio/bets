import { calculatePositionTables } from '../services/tablePositions.js'

const getTablePosition = async (req, res) => {
  try {
    const seasonId = req.params.id
    const positions = await calculatePositionTables(seasonId)
    res.json(positions)
  } catch (error) {
    res.status(500).send({ error: error.message })
  }
}

export const tablePositionController = {
  getTablePosition
}
