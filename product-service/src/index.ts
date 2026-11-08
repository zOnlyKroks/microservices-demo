import express, { Request, Response } from 'express'

interface Product {
  id: string
  name: string
  price: number
  stock: number
}

interface ReserveBody {
  quantity: number
}

const products = new Map<string, Product>([
  ['p1', { id: 'p1', name: 'Mechanical Keyboard', price: 89.9, stock: 10 }],
  ['p2', { id: 'p2', name: 'USB-C Hub', price: 34.5, stock: 3 }],
])

const app = express()
app.use(express.json())

app.get('/health', (_req: Request, res: Response) => {
  res.json({ service: 'product-service', status: 'UP' })
})

app.get('/products', (_req: Request, res: Response) => {
  res.json([...products.values()])
})

app.get('/products/:id', (req: Request<{ id: string }>, res: Response) => {
  const product = products.get(req.params.id)
  if (!product) {
    res.status(404).json({ error: 'Product not found' })
    return
  }
  res.json(product)
})

// Called by order-service; decrements stock atomically (single-threaded Node, no await between check and write)
app.post('/products/:id/reserve', (req: Request<{ id: string }, unknown, Partial<ReserveBody>>, res: Response) => {
  const product = products.get(req.params.id)
  if (!product) {
    res.status(404).json({ error: 'Product not found' })
    return
  }
  const quantity = req.body.quantity
  if (!Number.isInteger(quantity) || (quantity as number) <= 0) {
    res.status(400).json({ error: 'quantity must be a positive integer' })
    return
  }
  if (product.stock < (quantity as number)) {
    res.status(409).json({ error: 'Insufficient stock', available: product.stock })
    return
  }
  product.stock -= quantity as number
  res.json(product)
})

const port = Number(process.env.PORT ?? 3002)
app.listen(port, () => console.log(`product-service listening on :${port}`))
