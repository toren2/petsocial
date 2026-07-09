import React, { useState } from 'react'
import { supabase } from '../supabase'

const SEARCHES = [
  { category: 'vet', query: 'veterinarias en Ciudad de Panamá' },
  { category: 'groom', query: 'peluquerías caninas grooming en Ciudad de Panamá' },
  { category: 'park', query: 'parques pet friendly en Ciudad de Panamá' },
  { category: 'shop', query: 'pet shops tiendas de mascotas en Ciudad de Panamá' },
  { category: 'hotel', query: 'hoteles para mascotas en Ciudad de Panamá' },
  { category: 'restaurant', query: 'restaurantes pet friendly en Ciudad de Panamá' },
]

const typeLabels = {
  vet: 'Veterinaria',
  groom: 'Grooming',
  park: 'Parque pet-friendly',
  shop: 'Pet Shop',
  hotel: 'Hotel para mascotas',
  restaurant: 'Restaurante pet-friendly',
}

export default function AdminSeed() {
  const [log, setLog] = useState([])
  const [running, setRunning] = useState(false)

  function addLog(msg) {
    setLog(prev => [...prev, msg])
  }

  async function runSeed() {
    setRunning(true)
    setLog([])
    let totalInserted = 0

    for (const search of SEARCHES) {
      addLog(`Buscando: ${search.query}...`)
      try {
        const res = await fetch('/api/places', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: search.query }),
        })
        const data = await res.json()

        if (!data.places || data.places.length === 0) {
          addLog(`  Sin resultados para ${search.category}`)
          continue
        }

        for (const place of data.places) {
          const row = {
            name: place.displayName?.text || 'Sin nombre',
            type: typeLabels[search.category],
            category: search.category,
            rating: place.rating || 4.5,
            reviews: place.userRatingCount || 0,
            address: place.formattedAddress || 'Panamá',
            open: true,
            hours: 'Ver horario en Google Maps',
            lat: place.location?.latitude,
            lng: place.location?.longitude,
          }

          if (!row.lat || !row.lng) continue

          const { error } = await supabase.from('places').insert([row])
          if (error) {
            addLog(`  Error insertando ${row.name}: ${error.message}`)
          } else {
            addLog(`  ✓ ${row.name}`)
            totalInserted++
          }
        }
      } catch (err) {
        addLog(`  Error en ${search.category}: ${err.message}`)
      }
    }

    addLog(`\n✅ Completado. ${totalInserted} lugares insertados.`)
    setRunning(false)
  }

  async function clearOldPlaces() {
    if (!window.confirm('¿Borrar TODOS los lugares actuales de la tabla places?')) return
    const { error } = await supabase.from('places').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) addLog(`Error borrando: ${error.message}`)
    else addLog('Tabla places vaciada.')
  }

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', fontSize: 12 }}>
      <h2>Admin Seed — Places desde Google</h2>
      <button onClick={clearOldPlaces} style={{ marginRight: 10, padding: 10 }}>
        1. Borrar lugares actuales
      </button>
      <button onClick={runSeed} disabled={running} style={{ padding: 10 }}>
        {running ? 'Corriendo...' : '2. Importar lugares reales'}
      </button>
      <div style={{ marginTop: 20, whiteSpace: 'pre-wrap', maxHeight: 500, overflow: 'auto', background: '#f5f5f5', padding: 10 }}>
        {log.join('\n')}
      </div>
    </div>
  )
}