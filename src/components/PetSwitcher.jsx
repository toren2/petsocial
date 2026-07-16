import React from 'react'
import { Plus } from 'lucide-react'
import { useLanguage } from '../LanguageContext'

// Selector simple de mascota activa (Fase 1 de mascotas multiples), estilo
// selector de cuentas de Instagram: avatar/emoji + nombre, con un "+" al
// final para agregar otra mascota. Se usa en las pantallas de "registro
// personal" (Vacunas, Historial medico, Fotos de match) -- no en Match/Feed.
export default function PetSwitcher({ pets, activePetId, onSwitch, onAddClick }) {
  const { t } = useLanguage()
  if (!pets || pets.length === 0) return null

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-3">
      {pets.map(pet => {
        const active = pet.id === activePetId
        return (
          <button
            key={pet.id}
            onClick={() => onSwitch(pet.id)}
            className="flex-shrink-0 flex flex-col items-center gap-1 border-0 bg-transparent cursor-pointer"
            style={{ width: 60 }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
              style={{ border: active ? '2px solid #7C3AED' : '2px solid transparent', background: '#EDE9FE' }}
            >
              {pet.avatar_url ? (
                <img src={pet.avatar_url} alt={pet.pet_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl">{pet.emoji || '🐾'}</span>
              )}
            </div>
            <span
              className="text-[10px] font-medium truncate w-full text-center"
              style={{ color: active ? '#7C3AED' : '#6B7280' }}
            >
              {pet.pet_name}
            </span>
          </button>
        )
      })}

      <button
        onClick={onAddClick}
        className="flex-shrink-0 flex flex-col items-center gap-1 border-0 bg-transparent cursor-pointer"
        style={{ width: 60 }}
      >
        <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-dashed border-gray-300 flex-shrink-0">
          <Plus size={18} className="text-gray-400" />
        </div>
        <span className="text-[10px] font-medium text-gray-400 truncate w-full text-center">
          {t('mascotas.addPet')}
        </span>
      </button>
    </div>
  )
}
