import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Key, Copy, Trash2, Plus } from 'lucide-react'
import { Button } from '../components/common/Button'
import { ConfirmModal } from '../components/common/ConfirmModal'
import { useToast } from '../components/common/Toast'
import { api, type ApiToken } from '../api'

const SCOPES = ['read', 'write', 'admin'] as const

export function ApiTokens() {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [tokens, setTokens] = useState<ApiToken[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [revokeConfirmId, setRevokeConfirmId] = useState<number | null>(null)

  const [newName, setNewName] = useState('')
  const [newScopes, setNewScopes] = useState<string[]>(['read'])
  const [newExpiry, setNewExpiry] = useState(365)
  const [createdToken, setCreatedToken] = useState<string | null>(null)

  useEffect(() => {
    void loadTokens()
  }, [])

  const loadTokens = async () => {
    try {
      const data = await api.tokens.list()
      setTokens(data.data)
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : t('common:error'), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast(t('api_tokens.name_required'), 'error')
      return
    }
    if (newScopes.length === 0) {
      toast(t('api_tokens.scope_required'), 'error')
      return
    }

    setCreating(true)
    try {
      const result = await api.tokens.create({
        name: newName.trim(),
        scopes: newScopes,
        expiresInDays: newExpiry || undefined,
      })
      setCreatedToken(result.data.token)
      setNewName('')
      setNewScopes(['read'])
      void loadTokens()
      toast(t('api_tokens.created'), 'success')
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : t('common:error'), 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (id: number) => {
    try {
      await api.tokens.revoke(id)
      void loadTokens()
      toast(t('api_tokens.revoked'), 'success')
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : t('common:error'), 'error')
    } finally {
      setRevokeConfirmId(null)
    }
  }

  const toggleScope = (scope: string) => {
    setNewScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    )
  }

  const copyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token)
    } catch {
      // Fallback for non-HTTPS contexts (e.g. local HTTP on Unraid)
      const el = document.createElement('textarea')
      el.value = token
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.focus()
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    toast(t('api_tokens.copied'), 'success')
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--text-muted)]">
        {t('common.loading')}
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      <div className="flex items-center gap-3">
        <Key size={20} className="text-[var(--theme-primary)]" />
        <h1 className="text-xl font-bold font-mono">{t('api_tokens.title')}</h1>
      </div>

      {/* One-time token display */}
      {createdToken && (
        <div className="border border-emerald-500 bg-[var(--bg-elevated)] p-4 space-y-3">
          <p className="text-sm font-bold text-emerald-400">{t('api_tokens.save_token')}</p>
          <p className="text-xs text-[var(--text-muted)]">{t('api_tokens.token_warning')}</p>
          <div className="bg-[var(--bg-primary)] p-3 font-mono text-xs break-all border border-[var(--border-default)]">
            {createdToken}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => { void copyToken(createdToken) }}>
              <Copy size={12} /> {t('api_tokens.copy')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCreatedToken(null)}>
              {t('common:buttons.close')}
            </Button>
          </div>
        </div>
      )}

      {/* Create form */}
      <div className="border border-[var(--border-default)] p-4 space-y-4">
        <h2 className="text-sm font-bold font-mono text-[var(--text-muted)] uppercase tracking-widest">
          {t('api_tokens.create_new')}
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs text-[var(--text-muted)]">{t('api_tokens.token_name')}</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Home Assistant Integration"
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-default)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--theme-primary)]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[var(--text-muted)]">{t('api_tokens.expires_in')}</label>
            <select
              value={newExpiry}
              onChange={e => setNewExpiry(Number(e.target.value))}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-default)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--theme-primary)]"
            >
              <option value={30}>30 {t('api_tokens.days')}</option>
              <option value={90}>90 {t('api_tokens.days')}</option>
              <option value={365}>1 {t('api_tokens.year')}</option>
              <option value={0}>{t('api_tokens.never')}</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-[var(--text-muted)]">{t('api_tokens.scopes')}</label>
          <div className="flex gap-4">
            {SCOPES.map(scope => (
              <label key={scope} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newScopes.includes(scope)}
                  onChange={() => toggleScope(scope)}
                  className="accent-[var(--theme-primary)]"
                />
                <span className="text-sm text-[var(--text-primary)]">{scope}</span>
              </label>
            ))}
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => void handleCreate()}
          loading={creating}
          disabled={!newName.trim() || newScopes.length === 0}
        >
          <Plus size={12} /> {t('api_tokens.create_token')}
        </Button>
      </div>

      {/* Token list */}
      <div className="border border-[var(--border-default)]">
        <div className="px-4 py-3 border-b border-[var(--border-default)]">
          <h2 className="text-sm font-bold font-mono text-[var(--text-muted)] uppercase tracking-widest">
            {t('api_tokens.existing_tokens')}
          </h2>
        </div>

        {tokens.length === 0 ? (
          <div className="p-6 text-center text-sm text-[var(--text-muted)]">
            {t('api_tokens.no_tokens')}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border-default)] text-xs text-[var(--text-muted)] uppercase">
              <tr>
                <th className="text-left px-4 py-2">{t('api_tokens.token_name')}</th>
                <th className="text-left px-4 py-2">{t('api_tokens.scopes')}</th>
                <th className="text-left px-4 py-2">{t('api_tokens.last_used')}</th>
                <th className="text-left px-4 py-2">{t('api_tokens.expires')}</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {tokens.map(token => {
                const scopes = JSON.parse(token.scopes) as string[]
                return (
                  <tr key={token.id} className="border-b border-[var(--border-default)] last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{token.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {scopes.map(s => (
                          <span key={s} className="px-1.5 py-0.5 text-xs bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-muted)]">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                      {token.last_used_at ? new Date(token.last_used_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                      {token.expires_at ? new Date(token.expires_at).toLocaleDateString() : t('api_tokens.never')}
                    </td>
                    <td className="px-4 py-3">
                      {token.revoked === 1 ? (
                        <span className="text-xs text-red-500">{t('api_tokens.revoked_label')}</span>
                      ) : (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setRevokeConfirmId(token.id)}
                        >
                          <Trash2 size={12} /> {t('api_tokens.revoke')}
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmModal
        open={revokeConfirmId !== null}
        onConfirm={() => { if (revokeConfirmId !== null) void handleRevoke(revokeConfirmId) }}
        onCancel={() => setRevokeConfirmId(null)}
        title={t('api_tokens.revoke_confirm_title')}
        message={t('api_tokens.revoke_confirm_message')}
        variant="danger"
      />
    </div>
  )
}
