// middleware/verifyToken.js
import jwt from 'jsonwebtoken'

export const verifyToken = (req, res, next) => {
  const authorization = req.get('authorization')
  console.log('authorization', authorization)
  if (!authorization || !authorization.toLowerCase().startsWith('bearer')) {
    return res.status(401).send({ error: 'Token faltante o inválido. Por favor, inicia sesión.' })
  }

  const token = authorization.substring(7)
  let decodedToken = null
  try {
    decodedToken = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decodedToken.user // Añadir el usuario decodificado al objeto de solicitud
    next() // Continuar con el siguiente middleware
  } catch (error) {
    console.error(error)
    return res.status(401).send({ error: 'Token inválido o expirado. Por favor, inicia sesión.' })
  }
}
