// UserController.js

import { User } from '../../schemas/userSchema.js'

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
    res.json(users)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Hubo un error al obtener los usuarios' })
  }
}
