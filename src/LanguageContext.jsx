import React, { createContext, useContext, useState, useCallback } from 'react'
import { translations } from './i18n/translations'

const LanguageContext = createContext()

function getInitialLanguage() {
  try {
    const saved = localStorage.getItem('snoutt-lang')
    if (saved === 'en' || saved === 'es') return saved
  } catch {}
  return 'es'
}

function lookup(dict, key) {
  return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dict)
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage)

  const setLanguage = useCallback((lang) => {
    setLanguageState(lang)
    try { localStorage.setItem('snoutt-lang', lang) } catch {}
  }, [])

  const t = useCallback((key, vars) => {
    let value = lookup(translations[language], key)
    if (value == null) value = lookup(translations.es, key)
    if (value == null) value = key

    if (typeof value === 'string' && vars) {
      Object.keys(vars).forEach(k => {
        value = value.replaceAll(`{{${k}}}`, vars[k])
      })
    }
    return value
  }, [language])

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
