import express, { Request, Response, Express } from 'express'
import cors from 'cors'
import helmet from 'helmet'

export const app: Express = express()

app.use(express.json())
app.use(cors())
app.use(helmet())

app.get('/status', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        message: 'API  online'
    })
})