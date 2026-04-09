import { useEffect, useMemo, useState } from 'react'
import type { Target } from '../../../api'
import type { NASPowerConfig } from '../NASTargetForm'

export type TargetType = 'local' | 'nas'

export interface TargetWizardState {
  name: string
  type: TargetType
  enabled: boolean
  // local
  localPath: string
  // nas
  nasHost: string
  nasPort: number
  nasUser: string
  nasPass: string
  nasPrivateKey: string
  nasKnownHostsFile: string
  nasType: string
  nasPath: string
  nasPower: NASPowerConfig
}

const DEFAULT_POWER: NASPowerConfig = {
  enabled: false,
  mac: '',
  ip: '',
  autoShutdown: false,
}

const DEFAULTS: TargetWizardState = {
  name: '',
  type: 'local',
  enabled: true,
  localPath: '/unraid/user/backups',
  nasHost: '',
  nasPort: 22,
  nasUser: '',
  nasPass: '',
  nasPrivateKey: '',
  nasKnownHostsFile: '',
  nasType: '',
  nasPath: '/backups',
  nasPower: { ...DEFAULT_POWER },
}

function fromTarget(target: Target): TargetWizardState {
  const cfg = target.config
  const type = (target.type as TargetType) ?? 'local'
  return {
    name: target.name,
    type,
    enabled: target.enabled,
    localPath: type === 'local' ? ((cfg.path as string) ?? '') : DEFAULTS.localPath,
    nasHost: (cfg.host as string) ?? '',
    nasPort: (cfg.port as number) ?? 22,
    nasUser: (cfg.username as string) ?? '',
    nasPass: '',
    nasPrivateKey: (cfg.privateKey as string) ?? '',
    nasKnownHostsFile: (cfg.knownHostsFile as string) ?? '',
    nasType: (cfg.nasType as string) ?? '',
    nasPath: type === 'nas' ? ((cfg.path as string) ?? '') : DEFAULTS.nasPath,
    nasPower: (cfg.power as NASPowerConfig | undefined) ?? { ...DEFAULT_POWER },
  }
}

export interface UseTargetWizardStateOptions {
  initialTarget?: Target | null
  mode: 'create' | 'edit'
}

export interface UseTargetWizardStateResult {
  state: TargetWizardState
  update: <K extends keyof TargetWizardState>(key: K, value: TargetWizardState[K]) => void
  setState: (next: TargetWizardState) => void
  reset: () => void
  isDirty: boolean
  buildConfig: () => Record<string, unknown>
}

export function useTargetWizardState({ initialTarget, mode }: UseTargetWizardStateOptions): UseTargetWizardStateResult {
  const baseline = useMemo<TargetWizardState>(
    () => (initialTarget ? fromTarget(initialTarget) : { ...DEFAULTS, nasPower: { ...DEFAULT_POWER } }),
    [initialTarget],
  )

  const [state, setState] = useState<TargetWizardState>(baseline)

  useEffect(() => {
    setState(baseline)
  }, [baseline])

  const update = <K extends keyof TargetWizardState>(key: K, value: TargetWizardState[K]) => {
    setState(prev => {
      if (key === 'type' && prev.type !== value) {
        // type switch: keep name + enabled, otherwise reset type-specific state to defaults
        return {
          ...DEFAULTS,
          nasPower: { ...DEFAULT_POWER },
          name: prev.name,
          enabled: prev.enabled,
          type: value as TargetType,
        }
      }
      return { ...prev, [key]: value }
    })
  }

  const reset = () => setState(baseline)

  const isDirty = useMemo(() => {
    if (mode === 'create') {
      return (
        state.name.trim() !== '' ||
        (state.type === 'local' && state.localPath !== DEFAULTS.localPath) ||
        (state.type === 'nas' && (state.nasHost !== '' || state.nasUser !== '' || state.nasPass !== ''))
      )
    }
    // edit
    return JSON.stringify(state) !== JSON.stringify(baseline)
  }, [state, baseline, mode])

  const buildConfig = (): Record<string, unknown> => {
    if (state.type === 'local') {
      return { path: state.localPath }
    }
    return {
      host: state.nasHost,
      port: state.nasPort,
      username: state.nasUser,
      ...(state.nasPass ? { password: state.nasPass } : {}),
      ...(state.nasPrivateKey ? { privateKey: state.nasPrivateKey } : {}),
      ...(state.nasKnownHostsFile ? { knownHostsFile: state.nasKnownHostsFile } : {}),
      ...(state.nasType ? { nasType: state.nasType } : {}),
      path: state.nasPath,
      power: state.nasPower,
    }
  }

  return { state, update, setState, reset, isDirty, buildConfig }
}
