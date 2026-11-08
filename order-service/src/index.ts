import express, { Request, Response } from 'express'

interface User {
  id: string
  name: string
  email: string
}

interface Product {
  id: string
  name: string
  price: number
  stock: number
}

interface Order {
  id: string
  userId: string
  userName: string
  productId: string
  productName: string
  quantity: number
  total: number
  createdAt: string
}

interface CreateOrderBody {
  userId: string
  productId: string
  quantity: number
}

const userServiceUrl = process.env.USER_SERVICE_URL ?? 'http://localhost:3001'
const productServiceUrl = process.env.PRODUCT_SERVICE_URL ?? 'http://localhost:3002'

const orders = new Map<string, Order>()

const app = express()
app.use(express.json())

app.get('/health', (_req: Request, res: Response) => {
  res.json({ service: 'order-service', status: 'UP' })
})

app.get('/orders', (_req: Request, res: Response) => {
  res.json([...orders.values()])
})

app.get('/orders/:id', (req: Request<{ id: string }>, res: Response) => {
  const order = orders.get(req.params.id)
  if (!order) {
    res.status(404).json({ error: 'Order not found' })
    return
  }
  res.json(order)
})

app.post('/orders', async (req: Request<unknown, unknown, Partial<CreateOrderBody>>, res: Response) => {
  const { userId, productId, quantity } = req.body
  if (!userId || !productId || !Number.isInteger(quantity) || (quantity as number) <= 0) {
    res.status(400).json({ error: 'userId, productId and a positive integer quantity are required' })
    return
  }

  try {
    const userRes = await fetch(`${userServiceUrl}/users/${encodeURIComponent(userId)}`)
    if (userRes.status === 404) {
      res.status(404).json({ error: 'Unknown user' })
      return
    }
    if (!userRes.ok) {
      res.status(502).json({ error: 'user-service failed' })
      return
    }
    const user = (await userRes.json()) as User

    const reserveRes = await fetch(`${productServiceUrl}/products/${encodeURIComponent(productId)}/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity }),
    })
    if (reserveRes.status === 404) {
      res.status(404).json({ error: 'Unknown product' })
      return
    }
    if (reserveRes.status === 409) {
      res.status(409).json(await reserveRes.json())
      return
    }
    if (!reserveRes.ok) {
      res.status(502).json({ error: 'product-service failed' })
      return
    }
    const product = (await reserveRes.json()) as Product

    const order: Order = {
      id: crypto.randomUUID(),
      userId: user.id,
      userName: user.name,
      productId: product.id,
      productName: product.name,
      quantity: quantity as number,
      total: Math.round(product.price * (quantity as number) * 100) / 100,
      createdAt: new Date().toISOString(),
    }
    orders.set(order.id, order)
    res.status(201).json(order)
  } catch {
    res.status(503).json({ error: 'A dependent service is unreachable' })
  }
})

const port = Number(process.env.PORT ?? 3003)
app.listen(port, () => console.log(`order-service listening on :${port}`))
