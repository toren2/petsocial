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
    console.log('DEBUG places:', JSON.stringify({
      httpStatus: response.status,
      errorField: data.error || null,
      count: data.places?.length || 0,
      first: data.places?.[0] ? {
        name: data.places[0].displayName?.text,
        keys: Object.keys(data.places[0]),
        hasPhotos: 'photos' in data.places[0],
        photosLen: data.places[0].photos?.length || 0,
      } : null,
    }))
    res.status(200).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}