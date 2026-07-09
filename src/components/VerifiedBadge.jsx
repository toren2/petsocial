import React from 'react'
import { BadgeCheck } from 'lucide-react'
import { useLanguage } from '../LanguageContext'

export default function VerifiedBadge({ verified, size = 14 }) {
  const { t } = useLanguage()
  if (!verified) return null
  return <BadgeCheck size={size} color="#3B82F6" style={{ flexShrink: 0 }} aria-label={t('verificacion.verifiedAccount')} />
}
