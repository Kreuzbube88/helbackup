import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { Card } from '../common/Card'
import { useToast } from '../common/Toast'
import { api } from '../../api'

const CHANNELS = [
  { id: 'email',    name: 'Email (SMTP)' },
  { id: 'gotify',   name: 'Gotify' },
  { id: 'ntfy',     name: 'ntfy' },
  { id: 'pushover', name: 'Pushover' },
  { id: 'telegram', name: 'Telegram' },
  { id: 'discord',  name: 'Discord' },
  { id: 'slack',    name: 'Slack' },
] as const

type ChannelId = typeof CHANNELS[number]['id']

const EVENTS = [
  { id: 'backup_success',      label: 'Backup Success' },
  { id: 'backup_failed',       label: 'Backup Failed' },
  { id: 'backup_started',      label: 'Backup Started' },
  { id: 'verification_failed', label: 'Verification Failed' },
  { id: 'retention_cleanup',   label: 'Retention Cleanup' },
  { id: 'restore_failed',      label: 'Restore Failed' },
  { id: 'system_error',        label: 'System Error' },
] as const

const DEFAULT_EVENTS = ['backup_failed', 'verification_failed', 'system_error']

interface ConfigRow {
  channel: string
  enabled: number
  config: string
  events: string
}

function defaultConfig(channel: ChannelId): Record<string, unknown> {
  switch (channel) {
    case 'email':    return { host: '', port: 587, secure: false, auth: { user: '', pass: '' }, from: '', to: '' }
    case 'gotify':   return { url: '', token: '' }
    case 'ntfy':     return { url: 'https://ntfy.sh', topic: '', token: '' }
    case 'pushover': return { token: '', user: '' }
    case 'telegram': return { botToken: '', chatId: '' }
    case 'discord':  return { webhookUrl: '' }
    case 'slack':    return { webhookUrl: '' }
  }
}

export function NotificationSettings() {
  const { t } = useTranslation('common')
  const { toast } = useToast()

  const [configs, setConfigs] = useState<ConfigRow[]>([])
  const [selected, setSelected] = useState<ChannelId | null>(null)
  const [channelConfig, setChannelConfig] = useState<Record<string, unknown>>({})
  const [selectedEvents, setSelectedEvents] = useState<string[]>(DEFAULT_EVENTS)
  const [enabled, setEnabled] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => { void loadConfigs() }, [])

  async function loadConfigs() {
    try {
      const rows = await api.notifications.getAll()
      setConfigs(rows as ConfigRow[])
    } catch {
      // silently fail — non-critical
    }
  }

  function handleSelect(id: ChannelId) {
    const existing = configs.find(c => c.channel === id)
    if (existing) {
      setChannelConfig(JSON.parse(existing.config) as Record<string, unknown>)
      setSelectedEvents(JSON.parse(existing.events) as string[])
      setEnabled(existing.enabled === 1)
    } else {
      setChannelConfig(defaultConfig(id))
      setSelectedEvents(DEFAULT_EVENTS)
      setEnabled(true)
    }
    setSelected(id)
  }

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    try {
      await api.notifications.save({ channel: selected, enabled, config: channelConfig, events: selectedEvents })
      await loadConfigs()
      toast(t('notifications.saved'), 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    if (!selected) return
    setTesting(true)
    try {
      await api.notifications.test(selected, channelConfig)
      toast('Test notification sent!', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Test failed', 'error')
    } finally {
      setTesting(false)
    }
  }

  function toggleEvent(id: string) {
    setSelectedEvents(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    )
  }

  function setNestedConfig(path: string[], value: unknown) {
    setChannelConfig(prev => {
      const next = { ...prev }
      let cur: Record<string, unknown> = next
      for (let i = 0; i < path.length - 1; i++) {
        cur[path[i]] = { ...(cur[path[i]] as Record<string, unknown>) }
        cur = cur[path[i]] as Record<string, unknown>
      }
      cur[path[path.length - 1]] = value
      return next
    })
  }

  function renderChannelForm() {
    if (!selected) return null
    const cfg = channelConfig

    switch (selected) {
      case 'email':
        return (
          <div className="flex flex-col gap-3">
            <Input label="SMTP Host" value={(cfg.host as string) ?? ''} onChange={e => setChannelConfig(c => ({ ...c, host: e.target.value }))} placeholder="smtp.gmail.com" />
            <Input label="Port" type="number" value={(cfg.port as number) ?? 587} onChange={e => setChannelConfig(c => ({ ...c, port: parseInt(e.target.value) }))} />
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input type="checkbox" checked={(cfg.secure as boolean) ?? false} onChange={e => setChannelConfig(c => ({ ...c, secure: e.target.checked }))} />
              Use TLS/SSL
            </label>
            <Input label="Username" value={((cfg.auth as Record<string,string>)?.user) ?? ''} onChange={e => setNestedConfig(['auth', 'user'], e.target.value)} />
            <Input label="Password" type="password" value={((cfg.auth as Record<string,string>)?.pass) ?? ''} onChange={e => setNestedConfig(['auth', 'pass'], e.target.value)} />
            <Input label="From Address" value={(cfg.from as string) ?? ''} onChange={e => setChannelConfig(c => ({ ...c, from: e.target.value }))} placeholder="helbackup@example.com" />
            <Input label="To Address" value={(cfg.to as string) ?? ''} onChange={e => setChannelConfig(c => ({ ...c, to: e.target.value }))} placeholder="admin@example.com" />
          </div>
        )
      case 'gotify':
        return (
          <div className="flex flex-col gap-3">
            <Input label="Gotify URL" value={(cfg.url as string) ?? ''} onChange={e => setChannelConfig(c => ({ ...c, url: e.target.value }))} placeholder="https://gotify.example.com" />
            <Input label="App Token" value={(cfg.token as string) ?? ''} onChange={e => setChannelConfig(c => ({ ...c, token: e.target.value }))} placeholder="AQr..." />
          </div>
        )
      case 'ntfy':
        return (
          <div className="flex flex-col gap-3">
            <Input label="ntfy Server URL" value={(cfg.url as string) ?? 'https://ntfy.sh'} onChange={e => setChannelConfig(c => ({ ...c, url: e.target.value }))} placeholder="https://ntfy.sh" />
            <Input label="Topic" value={(cfg.topic as string) ?? ''} onChange={e => setChannelConfig(c => ({ ...c, topic: e.target.value }))} placeholder="helbackup-alerts" />
            <Input label="Token (optional)" value={(cfg.token as string) ?? ''} onChange={e => setChannelConfig(c => ({ ...c, token: e.target.value }))} placeholder="tk_..." />
          </div>
        )
      case 'pushover':
        return (
          <div className="flex flex-col gap-3">
            <Input label="App Token" value={(cfg.token as string) ?? ''} onChange={e => setChannelConfig(c => ({ ...c, token: e.target.value }))} placeholder="azGDORePK8gMaC0..." />
            <Input label="User Key" value={(cfg.user as string) ?? ''} onChange={e => setChannelConfig(c => ({ ...c, user: e.target.value }))} placeholder="uQiRzpo4DXghDm..." />
          </div>
        )
      case 'telegram':
        return (
          <div className="flex flex-col gap-3">
            <Input label="Bot Token" value={(cfg.botToken as string) ?? ''} onChange={e => setChannelConfig(c => ({ ...c, botToken: e.target.value }))} placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz1234567890" />
            <Input label="Chat ID" value={(cfg.chatId as string) ?? ''} onChange={e => setChannelConfig(c => ({ ...c, chatId: e.target.value }))} placeholder="-1001234567890" />
            <p className="text-xs text-[var(--text-secondary)]">
              Create a bot via @BotFather, start a chat, then get the chat_id from
              https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates
            </p>
          </div>
        )
      case 'discord':
        return (
          <div className="flex flex-col gap-3">
            <Input label="Webhook URL" value={(cfg.webhookUrl as string) ?? ''} onChange={e => setChannelConfig(c => ({ ...c, webhookUrl: e.target.value }))} placeholder="https://discord.com/api/webhooks/..." />
            <p className="text-xs text-[var(--text-secondary)]">Server Settings → Integrations → Webhooks → New Webhook</p>
          </div>
        )
      case 'slack':
        return (
          <div className="flex flex-col gap-3">
            <Input label="Webhook URL" value={(cfg.webhookUrl as string) ?? ''} onChange={e => setChannelConfig(c => ({ ...c, webhookUrl: e.target.value }))} placeholder="https://hooks.slack.com/services/..." />
            <p className="text-xs text-[var(--text-secondary)]">Workspace Settings → Apps → Incoming Webhooks</p>
          </div>
        )
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Channel list */}
        <div className="flex flex-col gap-2">
          {CHANNELS.map(ch => {
            const row = configs.find(c => c.channel === ch.id)
            const isSelected = selected === ch.id
            return (
              <button
                key={ch.id}
                onClick={() => handleSelect(ch.id)}
                className={[
                  'w-full p-3 text-left border-2 transition-colors',
                  isSelected
                    ? 'border-[var(--theme-glow)] bg-[var(--bg-secondary)]'
                    : 'border-[var(--border-default)] hover:border-[var(--border-hover)]',
                ].join(' ')}
              >
                <div className="font-medium text-sm">{ch.name}</div>
                <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {row ? (row.enabled ? '● Enabled' : '○ Disabled') : 'Not configured'}
                </div>
              </button>
            )
          })}
        </div>

        {/* Config panel */}
        {selected && (
          <div className="md:col-span-2">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">
                  {CHANNELS.find(c => c.id === selected)?.name}
                </h3>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={e => setEnabled(e.target.checked)}
                    className="w-4 h-4"
                  />
                  {t('notifications.enabled')}
                </label>
              </div>

              {renderChannelForm()}

              <div className="mt-5">
                <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  {t('notifications.events')}
                </p>
                <div className="flex flex-col gap-1.5">
                  {EVENTS.map(ev => (
                    <label key={ev.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(ev.id)}
                        onChange={() => toggleEvent(ev.id)}
                        className="w-4 h-4"
                      />
                      {ev.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <Button variant="primary" size="sm" onClick={() => { void handleSave() }} loading={saving}>
                  {t('buttons.save')}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => { void handleTest() }} loading={testing} disabled={saving}>
                  {t('notifications.test')}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
  )
}
