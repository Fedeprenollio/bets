import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { User } from '../../schemas/userSchema.js'
import dotenv from 'dotenv'

dotenv.config()

async function login (req, res) {
  const { username, password } = req.body
  try {
    if (!username || !password) {
      return res
        .status(400)
        .send({ status: 'error', message: 'Campos incompletos' })
    }

    // Verificar si el nombre de usuario ya está en uso
    const existingUser = await User.findOne({ username })
    if (!existingUser) {
      console.log('ENTREA?')
      return res
        .status(400)
        .send({ status: 'error', message: 'Usuario o password incorrectos' })
    }

    // Verificar la contraseña
    const isMatchCorrect = await bcrypt.compare(
      password,
      existingUser.password
    )

    // Si la contraseña no coincide, devolver un error
    if (!isMatchCorrect) {
      return res
        .status(401)
        .json({ status: 'error', message: 'Usuario o password incorrectos' })
    }

    const token = jwt.sign(
      { user: existingUser.username, role: existingUser.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    )

    const cookieOption = {
      expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000),
      path: '/'
    }

    res.cookie('jwt', token, cookieOption)
    return res.send({ status: 'ok', message: 'User loggeado', token, user: existingUser.username })
  } catch (error) {
    res.status(500).json({ message: 'Error en login' })
  }
}

async function register (req, res) {
  const { username, password, role } = req.body

  try {
    if (!username || !password) {
      return res
        .status(400)
        .send({ status: 'error', message: 'Campos incompletos' })
    }
    // Verificar si el nombre de usuario ya está en uso
    const existingUser = await User.findOne({ username })
    if (existingUser) {
      return res.status(400).json({
        status: 'Error',
        message: 'El nombre de usuario ya está en uso'
      })
    }

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(password, 10)

    // Crear el nuevo usuario
    const newUser = new User({
      username,
      password: hashedPassword,
      role
    })

    // Guardar el nuevo usuario en la base de datos
    await newUser.save()

    return res
      .status(201)
      .send({ status: 'ok', message: 'Usuario creado correctamente' })

    // Crear un token de autenticación
    // const token = jwt.sign({ userId: newUser._id }, 'secretKey', { expiresIn: '1h' })

    // Devolver el token como respuesta
    // res.status(201).json({ token })
  } catch (error) {
    res.status(500).json({ message: 'Error al crear el usuario' })
  }
}

async function logout (req, res) {
  // Limpiar o eliminar la cookie de autenticación
  res.cookie('jwt', 'Chau', {
    expires: new Date(0)
  })

  // Enviar respuesta al cliente
  res.status(200).json({ message: 'Sesión cerrada correctamente' })
}

export const methods = {
  login,
  register,
  logout
}
