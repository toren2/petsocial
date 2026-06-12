# BarkMatch 🐾

App estilo Tinder para encontrar amigos y compañeros para tu perro.

## Stack
- React 18 + Vite
- Tailwind CSS
- React Router DOM
- Lucide React (iconos)

## Arrancar el proyecto

```bash
npm install
npm run dev
```

Abre http://localhost:5173

## Estructura

```
src/
├── components/
│   ├── BottomNav.jsx     # Navegación inferior
│   └── MatchModal.jsx    # Modal de match
├── pages/
│   ├── Splash.jsx        # Pantalla de bienvenida
│   ├── Discover.jsx      # Swipe de perros
│   ├── Matches.jsx       # Lista de matches
│   ├── Chat.jsx          # Chat con matches
│   ├── Perfil.jsx        # Perfil de tu perro
│   └── Lugares.jsx       # Parques pet-friendly
├── data.js               # Datos mock (reemplazar con Supabase)
├── App.jsx               # Navegación principal
└── index.css             # Estilos globales + Tailwind
```

## Próximos pasos sugeridos para Claude Code

1. **Supabase**: Conectar base de datos real
   - Tabla `dogs` (perfil del perro)
   - Tabla `swipes` (likes/nopes)
   - Tabla `matches` (cuando ambos dieron like)
   - Tabla `messages` (chat)

2. **Auth**: Login con email/Google via Supabase Auth

3. **Fotos reales**: Upload de fotos con Supabase Storage

4. **Geolocalización**: `navigator.geolocation` + filtro por radio

5. **Filtros**: Por raza, tamaño, propósito (amigos/reproducción)

6. **Notificaciones**: Push notifications para nuevos matches

## Paleta de colores

- Purple principal: `#7C3AED`
- Pink: `#EC4899`
- Fondo: `#F9F7FF`
