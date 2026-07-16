import React, { useState } from 'react'
import { Bell } from 'lucide-react'
import { useAuth } from '../AuthContext'
import { useLanguage } from '../LanguageContext'
import { subscribeToPush } from '../push'

// Aviso propio de Snoutt para pedir el permiso de notificaciones, en vez
// de disparar el dialogo nativo del navegador sin contexto. El permiso
// del navegador solo se puede pedir "en limpio" una vez -- si el usuario
// le da bloquear sin saber para que era, el sitio no puede volver a
// preguntar (tendria que cambiarlo a mano en la configuracion del
// navegador). Mostrando primero el valor, solo disparamos el dialogo
// real si el usuario ya dijo que si.
export default function PushPermissionPrompt({ onClose }) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)

  async function handleActivate() {
    setLoading(true)
    try {
      await subscribeToPush(user.id)
    } catch (e) {
      // Si el usuario bloquea el dialogo nativo o algo falla, igual
      // cerramos -- ya quedo registrado que se le pregunto.
    }
    setLoading(false)
    onClose()
  }

  return (
    <div className="absolute inset-0 bg-black/50 z-50 flex flex-col justify-end">
      <div className="bg-white rounded-t-3xl flex flex-col px-5 pt-6 pb-5">
        <div className="flex flex-col items-center text-center gap-3 mb-2">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#EDE9FE' }}>
            <Bell size={24} className="text-ps-purple" />
          </div>
          <h3 className="font-bold text-gray-900 text-lg">{t('pushPrompt.title')}</h3>
          <p className="text-sm text-gray-500 leading-relaxed px-2">{t('pushPrompt.body')}</p>
        </div>

        <div className="flex flex-col gap-3 mt-3">
          <button
            onClick={handleActivate}
            disabled={loading}
            className="w-full py-3.5 rounded-full font-semibold text-white text-base border-0 cursor-pointer flex items-center justify-center gap-2"
            style={{ background: loading ? '#C4B5FD' : '#7C3AED' }}
          >
            <Bell size={16} /> {loading ? t('pushPrompt.activating') : t('pushPrompt.activate')}
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-full text-sm text-gray-400 border-0 bg-transparent cursor-pointer"
          >
            {t('pushPrompt.notNow')}
          </button>
        </div>
      </div>
    </div>
  )
}
