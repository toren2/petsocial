import React, { useState } from 'react'
import { ArrowLeft, Globe, AlertTriangle, Trash2, ChevronRight } from 'lucide-react'
import { supabase } from '../supabase'
import { useLanguage } from '../LanguageContext'
import PushToggle from '../components/PushToggle'

export default function Configuracion({ onBack, onSignOut }) {
  const { t, language, setLanguage } = useLanguage()
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteAccountError, setDeleteAccountError] = useState('')

  async function handleDeleteAccount() {
    setDeletingAccount(true)
    setDeleteAccountError('')
    const { error } = await supabase.rpc('delete_own_account')
    if (error) {
      setDeleteAccountError(t('perfil.deleteAccountError'))
      setDeletingAccount(false)
      return
    }
    onSignOut()
  }

  return (
    <div className="absolute inset-0 bg-white z-50 flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <button onClick={onBack} className="border-0 bg-transparent cursor-pointer text-ps-purple">
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-lg font-bold text-gray-900">{t('settings.title')}</h2>
      </div>

      <div className="flex-1 overflow-y-auto bg-ps-bg">
        <div className="bg-white mt-2">
          <button
            onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
            className="w-full flex items-center justify-between px-4 py-2.5 border-0 bg-transparent cursor-pointer text-left border-b border-gray-100"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Globe size={15} className="text-ps-purple" /> {t('settings.language')}
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-gray-400">
              {language === 'es' ? t('settings.languageEs') : t('settings.languageEn')}
              <ChevronRight size={14} className="text-gray-300" />
            </span>
          </button>

          <PushToggle />
        </div>

        <div className="mt-8 px-4">
          <button
            onClick={() => { setDeleteConfirmInput(''); setDeleteAccountError(''); setShowDeleteAccount(true) }}
            className="w-full py-2.5 text-xs font-medium text-red-500 border-0 bg-transparent cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Trash2 size={13} /> {t('perfil.deleteAccount')}
          </button>
        </div>
      </div>

      {showDeleteAccount && (
        <div className="absolute inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full bg-white rounded-t-3xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle size={20} />
              <h2 className="text-lg font-bold">{t('perfil.deleteAccountTitle')}</h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{t('perfil.deleteAccountWarning')}</p>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('perfil.deleteAccountTypeToConfirm')}</label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none bg-ps-bg"
                placeholder={t('perfil.deleteAccountConfirmWord')}
                value={deleteConfirmInput}
                onChange={e => setDeleteConfirmInput(e.target.value)}
              />
            </div>
            {deleteAccountError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-600">
                {deleteAccountError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteAccount(false)}
                className="flex-1 py-3 rounded-full text-sm font-semibold border border-gray-200 bg-white cursor-pointer text-gray-600"
              >
                {t('perfil.deleteAccountCancel')}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount || deleteConfirmInput.trim().toUpperCase() !== t('perfil.deleteAccountConfirmWord')}
                className="flex-1 py-3 rounded-full text-sm font-semibold border-0 cursor-pointer text-white"
                style={{ background: deletingAccount || deleteConfirmInput.trim().toUpperCase() !== t('perfil.deleteAccountConfirmWord') ? '#FCA5A5' : '#DC2626' }}
              >
                {deletingAccount ? t('perfil.deleteAccountDeleting') : t('perfil.deleteAccountButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
