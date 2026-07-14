export default async function handler(req, res) {
  const apiKey = process.env.GOOGLE_PLACES_SERVER_KEY
  const { query } = req.body

  if (!query) {
    return res.status(400).json({ error: 'Falta query' })
  }

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.id,places.photos',
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: 'es',
      }),
    })

    const data = await response.json()
    res.status(200).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}