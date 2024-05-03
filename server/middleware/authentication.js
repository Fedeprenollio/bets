import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import { User } from '../../schemas/userSchema.js'
dotenv.config()

const soloAdmin = async (req, res, next) => {
  const logged = await revisarCookie(req)
  console.log('SOY ADMIN?', logged)
  if (logged) return next()

  return res.status(401).json({ message: 'Unauthorized' }) // Enviar respuesta 401 si el usuario no está autenticado
}

const soloPublic = async (req, res, next) => {
  const logged = await revisarCookie(req)
  console.log('SOY LOGED?', logged)
  if (!logged) return next()

  return res.status(401).json({ message: 'Unauthorized' }) // Enviar respuesta 401 si el usuario no está autenticado
}

const revisarCookie = async (req) => {
  const cookies = req.headers.cookie
  try {
    const cookieJwt = cookies
      ?.split('; ')
      .find((cookie) => cookie.startsWith('jwt='))
      .slice(4)
    const decodificada = jwt.verify(cookieJwt, process.env.JWT_SECRET)
    console.log('QUIENE S?', decodificada)

    const useLogged = await User.find({ username: decodificada.user })

    if (!useLogged) {
      return false
    }

    return true
  } catch (error) {
    return false
  }
}
export const methods = {
  soloAdmin,
  soloPublic
}
