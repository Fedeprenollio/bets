import { Router } from 'express'
import { methods as authentication } from '../controllers/auth.controller.js'
import { methods as authorization } from '../middleware/authentication.js'

export const userRouter = Router()

// Ruta para crear un nuevo usuario
// userRouter.post('/register', async (req, res) => {
//   const { username, password } = req.body

//   try {
//     // Verificar si el nombre de usuario ya está en uso
//     const existingUser = await User.findOne({ username })
//     if (existingUser) {
//       return res.status(400).json({ message: 'El nombre de usuario ya está en uso' })
//     }

//     // Encriptar la contraseña
//     const hashedPassword = await bcrypt.hash(password, 10)

//     // Crear el nuevo usuario
//     const newUser = new User({
//       username,
//       password: hashedPassword
//     })

//     // Guardar el nuevo usuario en la base de datos
//     await newUser.save()

//     // Crear un token de autenticación
//     const token = jwt.sign({ userId: newUser._id }, 'secretKey', { expiresIn: '1h' })

//     // Devolver el token como respuesta
//     res.status(201).json({ token })
//   } catch (error) {
//     res.status(500).json({ message: 'Error al crear el usuario' })
//   }
// })
userRouter.post('/register', authorization.soloAdmin, authentication.register)
userRouter.post('/login', authorization.soloPublic, authentication.login)
userRouter.get('/logout', authorization.soloAdmin, authentication.logout)

// userRouter.get('/', getAllUsers)
