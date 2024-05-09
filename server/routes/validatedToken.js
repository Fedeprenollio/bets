import express from 'express'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
dotenv.config()

const verifyTokenRouter = express.Router()

verifyTokenRouter.post('/', (req, res) => {
  // Obtener el token de la cabecera de autorización
  const authorization = req.get('authorization')
  console.log('authorization', authorization)
  const token = authorization && authorization.split(' ')[1] // Obtener solo el token sin 'Bearer'

  if (!token) {
    return res.status(400).json({ valid: false, message: 'Token not provided' })
  }

  try {
    // Verificar el token utilizando el secreto o la clave pública según cómo se generó
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ valid: false, message: 'Invalid token' })
      }
      // El token es válido
      res.json({ valid: true })
    })
  } catch (error) {
    console.error('Error verifying token:', error.message)
    res.status(500).json({ valid: false, message: 'Internal server error' })
  }
})

export default verifyTokenRouter
