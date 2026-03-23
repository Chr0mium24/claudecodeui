import { LogIn, Pencil, Settings2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { Badge, Button, Input } from '../../../../../../../shared/view/ui';
import SessionProviderLogo from '../../../../../../llm-logo-provider/SessionProviderLogo';
import type { AgentProvider, AuthStatus, CodexAccount } from '../../../../../types/types';

type AccountContentProps = {
  agent: AgentProvider;
  authStatus: AuthStatus;
  onLogin: (accountId?: string) => void;
  codexAccounts?: CodexAccount[];
  onCreateCodexAccount?: (name: string) => Promise<CodexAccount | null>;
  onRenameCodexAccount?: (accountId: string, name: string) => Promise<void>;
  onSetActiveCodexAccount?: (accountId: string) => Promise<void>;
  onDeleteCodexAccount?: (accountId: string) => Promise<void>;
};

type AgentVisualConfig = {
  name: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  subtextClass: string;
  buttonClass: string;
  description?: string;
};

type CodexAccountMenuState = {
  accountId: string;
  top: number;
  left: number;
} | null;

const agentConfig: Record<AgentProvider, AgentVisualConfig> = {
  claude: {
    name: 'Claude',
    bgClass: 'bg-blue-50 dark:bg-blue-900/20',
    borderClass: 'border-blue-200 dark:border-blue-800',
    textClass: 'text-blue-900 dark:text-blue-100',
    subtextClass: 'text-blue-700 dark:text-blue-300',
    buttonClass: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
  },
  cursor: {
    name: 'Cursor',
    bgClass: 'bg-purple-50 dark:bg-purple-900/20',
    borderClass: 'border-purple-200 dark:border-purple-800',
    textClass: 'text-purple-900 dark:text-purple-100',
    subtextClass: 'text-purple-700 dark:text-purple-300',
    buttonClass: 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800',
  },
  codex: {
    name: 'Codex',
    bgClass: 'bg-muted/50',
    borderClass: 'border-gray-300 dark:border-gray-600',
    textClass: 'text-gray-900 dark:text-gray-100',
    subtextClass: 'text-gray-700 dark:text-gray-300',
    buttonClass: 'bg-gray-800 hover:bg-gray-900 active:bg-gray-950 dark:bg-gray-700 dark:hover:bg-gray-600 dark:active:bg-gray-500',
  },
  gemini: {
    name: 'Gemini',
    description: 'Google Gemini AI assistant',
    bgClass: 'bg-indigo-50 dark:bg-indigo-900/20',
    borderClass: 'border-indigo-200 dark:border-indigo-800',
    textClass: 'text-indigo-900 dark:text-indigo-100',
    subtextClass: 'text-indigo-700 dark:text-indigo-300',
    buttonClass: 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800',
  },
};

export default function AccountContent({
  agent,
  authStatus,
  onLogin,
  codexAccounts = [],
  onCreateCodexAccount,
  onRenameCodexAccount,
  onSetActiveCodexAccount,
  onDeleteCodexAccount,
}: AccountContentProps) {
  const { t } = useTranslation('settings');
  const config = agentConfig[agent];
  const [newCodexAccountName, setNewCodexAccountName] = useState('');
  const [isSubmittingCodexAccount, setIsSubmittingCodexAccount] = useState(false);
  const [codexAccountError, setCodexAccountError] = useState<string | null>(null);
  const [openCodexAccountMenu, setOpenCodexAccountMenu] = useState<CodexAccountMenuState>(null);
  const [codexAccountActionId, setCodexAccountActionId] = useState<string | null>(null);

  const handleCreateCodexAccount = async () => {
    const name = newCodexAccountName.trim();
    if (!name || !onCreateCodexAccount) {
      return;
    }

    setIsSubmittingCodexAccount(true);
    setCodexAccountError(null);
    try {
      const createdAccount = await onCreateCodexAccount(name);
      setNewCodexAccountName('');
      if (createdAccount?.id) {
        onLogin(createdAccount.id);
      }
    } catch (error) {
      setCodexAccountError(error instanceof Error ? error.message : 'Failed to create Codex account');
    } finally {
      setIsSubmittingCodexAccount(false);
    }
  };

  const handleRenameCodexAccount = async (account: CodexAccount) => {
    if (!onRenameCodexAccount) {
      return;
    }

    const nextName = window.prompt('Rename Codex account', account.name);
    if (nextName === null) {
      return;
    }

    const trimmedName = nextName.trim();
    if (!trimmedName || trimmedName === account.name) {
      return;
    }

    setCodexAccountError(null);
    setCodexAccountActionId(account.id);
    try {
      await onRenameCodexAccount(account.id, trimmedName);
      setOpenCodexAccountMenu(null);
    } catch (error) {
      setCodexAccountError(error instanceof Error ? error.message : 'Failed to rename Codex account');
    } finally {
      setCodexAccountActionId(null);
    }
  };

  const handleSetActiveAccount = async (accountId: string) => {
    if (!onSetActiveCodexAccount) {
      return;
    }

    setCodexAccountError(null);
    setCodexAccountActionId(accountId);
    try {
      await onSetActiveCodexAccount(accountId);
    } catch (error) {
      setCodexAccountError(error instanceof Error ? error.message : 'Failed to switch Codex account');
    } finally {
      setCodexAccountActionId(null);
    }
  };

  const handleDeleteCodexAccount = async (account: CodexAccount) => {
    if (!onDeleteCodexAccount || account.isDefault) {
      return;
    }

    const confirmed = window.confirm(`Delete Codex account "${account.name}"?`);
    if (!confirmed) {
      return;
    }

    setCodexAccountError(null);
    setCodexAccountActionId(account.id);
    try {
      await onDeleteCodexAccount(account.id);
      setOpenCodexAccountMenu(null);
    } catch (error) {
      setCodexAccountError(error instanceof Error ? error.message : 'Failed to delete Codex account');
    } finally {
      setCodexAccountActionId(null);
    }
  };

  const toggleCodexAccountMenu = (accountId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 192;
    const menuHeight = 132;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const nextLeft = Math.min(rect.right - menuWidth, viewportWidth - menuWidth - 12);
    const preferredTop = rect.bottom + 8;
    const nextTop = preferredTop + menuHeight > viewportHeight
      ? Math.max(12, rect.top - menuHeight - 8)
      : preferredTop;

    setOpenCodexAccountMenu((current) => (
      current?.accountId === accountId
        ? null
        : {
            accountId,
            top: nextTop,
            left: Math.max(12, nextLeft),
          }
    ));
  };

  return (
    <div className="space-y-6">
      <div className="mb-4 flex items-center gap-3">
        <SessionProviderLogo provider={agent} className="h-6 w-6" />
        <div>
          <h3 className="text-lg font-medium text-foreground">{config.name}</h3>
          <p className="text-sm text-muted-foreground">{t(`agents.account.${agent}.description`)}</p>
        </div>
      </div>

      {agent !== 'codex' && (
        <div className={`${config.bgClass} border ${config.borderClass} rounded-lg p-4`}>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className={`font-medium ${config.textClass}`}>
                  {t('agents.connectionStatus')}
                </div>
                <div className={`text-sm ${config.subtextClass}`}>
                  {authStatus.loading ? (
                    t('agents.authStatus.checkingAuth')
                  ) : authStatus.authenticated ? (
                    t('agents.authStatus.loggedInAs', {
                      email: authStatus.email || t('agents.authStatus.authenticatedUser'),
                    })
                  ) : (
                    t('agents.authStatus.notConnected')
                  )}
                </div>
              </div>
              <div>
                {authStatus.loading ? (
                  <Badge variant="secondary" className="bg-muted">
                    {t('agents.authStatus.checking')}
                  </Badge>
                ) : authStatus.authenticated ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                    {t('agents.authStatus.connected')}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                    {t('agents.authStatus.disconnected')}
                  </Badge>
                )}
              </div>
            </div>

            {authStatus.method !== 'api_key' && (
              <div className="border-t border-border/50 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`font-medium ${config.textClass}`}>
                      {authStatus.authenticated ? t('agents.login.reAuthenticate') : t('agents.login.title')}
                    </div>
                    <div className={`text-sm ${config.subtextClass}`}>
                      {authStatus.authenticated
                        ? t('agents.login.reAuthDescription')
                        : t('agents.login.description', { agent: config.name })}
                    </div>
                  </div>
                  <Button
                    onClick={() => onLogin()}
                    className={`${config.buttonClass} text-white`}
                    size="sm"
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    {authStatus.authenticated ? t('agents.login.reLoginButton') : t('agents.login.button')}
                  </Button>
                </div>
              </div>
            )}

            {authStatus.error && (
              <div className="border-t border-border/50 pt-4">
                <div className="text-sm text-red-600 dark:text-red-400">
                  {t('agents.error', { error: authStatus.error })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {agent === 'codex' && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-4">
            <div className="font-medium text-foreground">Codex Accounts</div>
            <div className="text-sm text-muted-foreground">
              Login state stays per account. Conversation history is shared across accounts.
            </div>
          </div>

          <div className="mb-4 flex gap-2">
            <Input
              value={newCodexAccountName}
              onChange={(event) => {
                setNewCodexAccountName(event.target.value);
                if (codexAccountError) {
                  setCodexAccountError(null);
                }
              }}
              placeholder="New account name"
            />
            <Button
              type="button"
              variant="outline"
              disabled={!newCodexAccountName.trim() || isSubmittingCodexAccount}
              onClick={() => {
                void handleCreateCodexAccount();
              }}
            >
              Add
            </Button>
          </div>

          {codexAccountError ? (
            <div className="mb-4 text-sm text-red-600 dark:text-red-400">
              {codexAccountError}
            </div>
          ) : null}

          <div className="space-y-2">
            {codexAccounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{account.name}</span>
                    {account.isActive ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        Active
                      </Badge>
                    ) : null}
                    {account.isDefault ? (
                      <Badge variant="secondary" className="bg-muted text-muted-foreground">
                        Default
                      </Badge>
                    ) : null}
                  </div>
                  <div className="truncate text-sm text-muted-foreground">
                    {account.status?.authenticated
                      ? `Logged in as ${account.status.email || 'Authenticated'}`
                      : account.status?.error || 'Not logged in'}
                  </div>
                </div>

                <div className="ml-3 flex items-center gap-2">
                  {!account.isActive && onSetActiveCodexAccount ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={codexAccountActionId === account.id}
                      onClick={() => {
                        void handleSetActiveAccount(account.id);
                      }}
                    >
                      Use
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Open settings for ${account.name}`}
                    onClick={(event) => {
                      toggleCodexAccountMenu(account.id, event);
                    }}
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {agent === 'codex' && openCodexAccountMenu && typeof document !== 'undefined'
        ? createPortal(
            <>
              <button
                type="button"
                aria-label="Close Codex account menu"
                className="fixed inset-0 z-40 cursor-default bg-transparent"
                onClick={() => {
                  setOpenCodexAccountMenu(null);
                }}
              />
              {(() => {
                const account = codexAccounts.find((entry) => entry.id === openCodexAccountMenu.accountId);
                if (!account) {
                  return null;
                }

                return (
                  <div
                    className="fixed z-50 w-48 rounded-md border border-border bg-popover p-1 shadow-lg"
                    style={{ top: openCodexAccountMenu.top, left: openCodexAccountMenu.left }}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      disabled={codexAccountActionId === account.id}
                      onClick={() => {
                        void handleRenameCodexAccount(account);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Rename
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      disabled={codexAccountActionId === account.id}
                      onClick={() => {
                        setOpenCodexAccountMenu(null);
                        onLogin(account.id);
                      }}
                    >
                      <LogIn className="mr-2 h-4 w-4" />
                      {account.status?.authenticated ? 'Re-login' : 'Login'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      disabled={Boolean(account.isDefault) || codexAccountActionId === account.id}
                      onClick={() => {
                        void handleDeleteCodexAccount(account);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {account.isDefault ? 'Delete unavailable' : 'Delete'}
                    </Button>
                  </div>
                );
              })()}
            </>,
            document.body,
          )
        : null}
    </div>
  );
}
