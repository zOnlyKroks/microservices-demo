import express, { Request, Response } from 'express'

interface User {
  id: string
  name: string
  email: string
}

interface CreateUserBody {
  name: string
  email: string
}

const users = new Map<string, User>([
  ['u1', { id: 'u1', name: 'Alice Example', email: 'alice@example.com' }],
  ['u2', { id: 'u2', name: 'Bob Example', email: 'bob@example.com' }],
])

const app = express()
app.use(express.json())

app.get('/health', (_req: Request, res: Response) => {
  res.json({ service: 'user-service', status: 'UP' })
})

app.get('/users', (_req: Request, res: Response) => {
  res.json([...users.values()])
})

app.get('/users/:id', (req: Request<{ id: string }>, res: Response) => {
  const user = users.get(req.params.id)
  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }
  res.json(user)
})

app.post('/users', (req: Request<unknown, unknown, Partial<CreateUserBody>>, res: Response) => {
  const { name, email } = req.body
  if (!name || !email) {
    res.status(400).json({ error: 'name and email are required' })
    return
  }
  const user: User = { id: crypto.randomUUID(), name, email }
  users.set(user.id, user)
  res.status(201).json(user)
})

const port = Number(process.env.PORT ?? 3001)
app.listen(port, () => console.log(`user-service listening on :${port}`))
