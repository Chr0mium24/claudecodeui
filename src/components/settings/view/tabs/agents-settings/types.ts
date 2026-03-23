import type {
  AgentProvider,
  AuthStatus,
  AgentCategory,
  ClaudePermissionsState,
  CodexAccount,
  CursorPermissionsState,
  CodexPermissionMode,
  GeminiPermissionMode,
  McpServer,
  McpToolsResult,
  McpTestResult,
} from '../../../types/types';

export type AgentContext = {
  authStatus: AuthStatus;
  onLogin: (accountId?: string) => void;
  codexAccounts?: CodexAccount[];
  onCreateCodexAccount?: (name: string) => Promise<CodexAccount | null>;
  onRenameCodexAccount?: (accountId: string, name: string) => Promise<void>;
  onSetActiveCodexAccount?: (accountId: string) => Promise<void>;
  onDeleteCodexAccount?: (accountId: string) => Promise<void>;
};

export type AgentContextByProvider = Record<AgentProvider, AgentContext>;

export type AgentsSettingsTabProps = {
  claudeAuthStatus: AuthStatus;
  cursorAuthStatus: AuthStatus;
  codexAuthStatus: AuthStatus;
  codexAccounts: CodexAccount[];
  geminiAuthStatus: AuthStatus;
  onClaudeLogin: (accountId?: string) => void;
  onCursorLogin: (accountId?: string) => void;
  onCodexLogin: (accountId?: string) => void;
  onCreateCodexAccount: (name: string) => Promise<CodexAccount | null>;
  onRenameCodexAccount: (accountId: string, name: string) => Promise<void>;
  onSetActiveCodexAccount: (accountId: string) => Promise<void>;
  onDeleteCodexAccount: (accountId: string) => Promise<void>;
  onGeminiLogin: (accountId?: string) => void;
  claudePermissions: ClaudePermissionsState;
  onClaudePermissionsChange: (value: ClaudePermissionsState) => void;
  cursorPermissions: CursorPermissionsState;
  onCursorPermissionsChange: (value: CursorPermissionsState) => void;
  codexPermissionMode: CodexPermissionMode;
  onCodexPermissionModeChange: (value: CodexPermissionMode) => void;
  geminiPermissionMode: GeminiPermissionMode;
  onGeminiPermissionModeChange: (value: GeminiPermissionMode) => void;
  mcpServers: McpServer[];
  cursorMcpServers: McpServer[];
  codexMcpServers: McpServer[];
  mcpTestResults: Record<string, McpTestResult>;
  mcpServerTools: Record<string, McpToolsResult>;
  mcpToolsLoading: Record<string, boolean>;
  deleteError: string | null;
  onOpenMcpForm: (server?: McpServer) => void;
  onDeleteMcpServer: (serverId: string, scope?: string) => void;
  onTestMcpServer: (serverId: string, scope?: string) => void;
  onDiscoverMcpTools: (serverId: string, scope?: string) => void;
  onOpenCodexMcpForm: (server?: McpServer) => void;
  onDeleteCodexMcpServer: (serverId: string) => void;
};

export type AgentCategoryTabsSectionProps = {
  selectedCategory: AgentCategory;
  onSelectCategory: (category: AgentCategory) => void;
};

export type AgentSelectorSectionProps = {
  selectedAgent: AgentProvider;
  onSelectAgent: (agent: AgentProvider) => void;
  agentContextById: AgentContextByProvider;
};

export type AgentCategoryContentSectionProps = {
  selectedAgent: AgentProvider;
  selectedCategory: AgentCategory;
  agentContextById: AgentContextByProvider;
  claudePermissions: ClaudePermissionsState;
  onClaudePermissionsChange: (value: ClaudePermissionsState) => void;
  cursorPermissions: CursorPermissionsState;
  onCursorPermissionsChange: (value: CursorPermissionsState) => void;
  codexPermissionMode: CodexPermissionMode;
  onCodexPermissionModeChange: (value: CodexPermissionMode) => void;
  geminiPermissionMode: GeminiPermissionMode;
  onGeminiPermissionModeChange: (value: GeminiPermissionMode) => void;
  mcpServers: McpServer[];
  cursorMcpServers: McpServer[];
  codexMcpServers: McpServer[];
  mcpTestResults: Record<string, McpTestResult>;
  mcpServerTools: Record<string, McpToolsResult>;
  mcpToolsLoading: Record<string, boolean>;
  deleteError: string | null;
  onOpenMcpForm: (server?: McpServer) => void;
  onDeleteMcpServer: (serverId: string, scope?: string) => void;
  onTestMcpServer: (serverId: string, scope?: string) => void;
  onDiscoverMcpTools: (serverId: string, scope?: string) => void;
  onOpenCodexMcpForm: (server?: McpServer) => void;
  onDeleteCodexMcpServer: (serverId: string) => void;
};
