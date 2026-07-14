export default async function handler(req, res) {
  const apiKey = process.env.GOOGLE_PLACES_SERVER_KEY
  const { name } = req.query

  if (!name) {
    return res.status(400).json({ error: 'Falta name' })
  }

  try {
    const url = `https://places.googleapis.com/v1/${name}/media?maxWidthPx=800&key=${apiKey}`
    const response = await fetch(url)

    if (!response.ok) {
      return res.status(response.status).json({ error: 'No se pudo obtener la foto' })
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const buffer = Buffer.from(await response.arrayBuffer())

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.status(200).send(buffer)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
