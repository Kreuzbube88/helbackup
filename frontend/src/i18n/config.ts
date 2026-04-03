import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import deCommon from './de/common.json'
import deAuth from './de/auth.json'
import deSettings from './de/settings.json'
import enCommon from './en/common.json'
import enAuth from './en/auth.json'
import enSettings from './en/settings.json'

i18n.use(initReactI18next).init({
  resources: {
    de: {
      common: deCommon,
      auth: deAuth,
      settings: deSettings,
    },
    en: {
      common: enCommon,
      auth: enAuth,
      settings: enSettings,
    },
  },
  lng: (localStorage.getItem('helbackup_lang') as string | null) ?? 'de',
  fallbackLng: 'de',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
})

export default i18n
