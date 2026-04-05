import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import deCommon from './de/common.json'
import deAuth from './de/auth.json'
import deSettings from './de/settings.json'
import deJobs from './de/jobs.json'
import deTargets from './de/targets.json'
import deAbout from './de/about.json'
import enCommon from './en/common.json'
import enAuth from './en/auth.json'
import enSettings from './en/settings.json'
import enJobs from './en/jobs.json'
import enTargets from './en/targets.json'
import enAbout from './en/about.json'

i18n.use(initReactI18next).init({
  resources: {
    de: {
      common: deCommon,
      auth: deAuth,
      settings: deSettings,
      jobs: deJobs,
      targets: deTargets,
      about: deAbout,
    },
    en: {
      common: enCommon,
      auth: enAuth,
      settings: enSettings,
      jobs: enJobs,
      targets: enTargets,
      about: enAbout,
    },
  },
  lng: (localStorage.getItem('helbackup_lang') as string | null) ?? 'de',
  fallbackLng: 'de',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
})

export default i18n
