import express, { Request, Response, Express } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import userRoutes from './routes/userRoutes'
import schoolRoutes from './routes/schoolRoutes'
import authRoutes from './routes/authRoutes'
import { authMiddleware } from './middlewares/authMiddleware'

export const app: Express = express()

app.use(express.json())
app.use(cors())
app.use(helmet())

app.get('/status', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'API  online',
  })
})

app.use('/auth', authRoutes)
app.use('/users', authMiddleware, userRoutes)
app.use('/schools', authMiddleware, schoolRoutes)
