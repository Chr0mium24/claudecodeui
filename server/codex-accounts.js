import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

const CLOUDCLI_DIR = path.join(os.homedir(), '.cloudcli');
const CODEX_ACCOUNTS_DIR = path.join(CLOUDCLI_DIR, 'codex-accounts');
const REGISTRY_PATH = path.join(CLOUDCLI_DIR, 'codex-accounts.json');
const DEFAULT_ACCOUNT_ID = 'default';

function getLegacyCodexHome() {
  return path.join(os.homedir(), '.codex');
}

function createDefaultAccount(now = new Date().toISOString()) {
  return {
    id: DEFAULT_ACCOUNT_ID,
    name: 'Default',
    codexHome: getLegacyCodexHome(),
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  };
}

async function ensureRegistryStorage() {
  await fs.mkdir(CLOUDCLI_DIR, { recursive: true });
  await fs.mkdir(CODEX_ACCOUNTS_DIR, { recursive: true });
}

function slugifyAccountName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function makeAccountId(name, existingIds) {
  const base = slugifyAccountName(name) || 'codex-account';

  if (!existingIds.has(base)) {
    return base;
  }

  let suffix = 2;
  while (existingIds.has(`${base}-${suffix}`)) {
    suffix += 1;
  }

  return `${base}-${suffix}`;
}

function normalizeCodexHome(inputPath, accountId) {
  if (!inputPath || typeof inputPath !== 'string') {
    return path.join(CODEX_ACCOUNTS_DIR, accountId);
  }

  return path.resolve(inputPath);
}

function isValidRegistryShape(value) {
  return Boolean(value && typeof value === 'object' && Array.isArray(value.accounts));
}

async function saveCodexRegistry(registry) {
  await ensureRegistryStorage();
  await fs.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf8');
  return registry;
}

async function loadCodexRegistry() {
  await ensureRegistryStorage();

  let parsed = null;
  try {
    parsed = JSON.parse(await fs.readFile(REGISTRY_PATH, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('[CodexAccounts] Failed to read registry, recreating:', error.message);
    }
  }

  const now = new Date().toISOString();
  const defaultAccount = createDefaultAccount(now);
  let registry = isValidRegistryShape(parsed)
    ? {
        activeAccountId: typeof parsed.activeAccountId === 'string' ? parsed.activeAccountId : DEFAULT_ACCOUNT_ID,
        accounts: parsed.accounts.filter((account) => account && typeof account.id === 'string'),
      }
    : {
        activeAccountId: DEFAULT_ACCOUNT_ID,
        accounts: [],
      };

  const defaultIndex = registry.accounts.findIndex((account) => account.id === DEFAULT_ACCOUNT_ID);
  if (defaultIndex === -1) {
    registry.accounts.unshift(defaultAccount);
  } else {
    registry.accounts[defaultIndex] = {
      ...defaultAccount,
      ...registry.accounts[defaultIndex],
      id: DEFAULT_ACCOUNT_ID,
      name: registry.accounts[defaultIndex]?.name || defaultAccount.name,
      codexHome: registry.accounts[defaultIndex]?.codexHome || defaultAccount.codexHome,
      isDefault: true,
    };
  }

  if (!registry.accounts.some((account) => account.id === registry.activeAccountId)) {
    registry.activeAccountId = DEFAULT_ACCOUNT_ID;
  }

  await Promise.all(
    registry.accounts.map((account) => fs.mkdir(account.codexHome, { recursive: true })),
  );
  await saveCodexRegistry(registry);
  return registry;
}

function decodeIdTokenEmail(idToken) {
  if (typeof idToken !== 'string' || !idToken.includes('.')) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8'));
    return payload.email || payload.user || null;
  } catch {
    return null;
  }
}

export async function readCodexAccountStatus(codexHome) {
  try {
    const authPath = path.join(codexHome, 'auth.json');
    const content = await fs.readFile(authPath, 'utf8');
    const auth = JSON.parse(content);
    const tokens = auth.tokens || {};

    if (tokens.id_token || tokens.access_token) {
      return {
        authenticated: true,
        email: decodeIdTokenEmail(tokens.id_token) || 'Authenticated',
        error: null,
        method: 'oauth',
      };
    }

    if (auth.OPENAI_API_KEY) {
      return {
        authenticated: true,
        email: 'API Key Auth',
        error: null,
        method: 'api_key',
      };
    }

    return {
      authenticated: false,
      email: null,
      error: 'No valid tokens found',
      method: null,
    };
  } catch (error) {
    return {
      authenticated: false,
      email: null,
      error: error.code === 'ENOENT' ? 'Codex not configured' : error.message,
      method: null,
    };
  }
}

export async function listCodexAccounts() {
  const registry = await loadCodexRegistry();
  const accounts = await Promise.all(
    registry.accounts.map(async (account) => ({
      ...account,
      status: await readCodexAccountStatus(account.codexHome),
      isActive: account.id === registry.activeAccountId,
    })),
  );

  return {
    activeAccountId: registry.activeAccountId,
    accounts,
  };
}

export async function getActiveCodexAccount() {
  const registry = await loadCodexRegistry();
  return registry.accounts.find((account) => account.id === registry.activeAccountId) || registry.accounts[0];
}

export async function resolveCodexAccount(accountId = null) {
  const registry = await loadCodexRegistry();
  const resolvedId = accountId || registry.activeAccountId;
  const account = registry.accounts.find((entry) => entry.id === resolvedId);

  if (!account) {
    throw new Error(`Unknown Codex account: ${resolvedId}`);
  }

  await fs.mkdir(account.codexHome, { recursive: true });
  return account;
}

export function getCodexAccountIdFromRequest(req) {
  const headerValue = req.headers['x-codex-account-id'];
  if (typeof headerValue === 'string' && headerValue.trim()) {
    return headerValue.trim();
  }

  if (typeof req.query?.accountId === 'string' && req.query.accountId.trim()) {
    return req.query.accountId.trim();
  }

  if (req.body && typeof req.body.accountId === 'string' && req.body.accountId.trim()) {
    return req.body.accountId.trim();
  }

  return null;
}

export async function resolveCodexAccountFromRequest(req) {
  return resolveCodexAccount(getCodexAccountIdFromRequest(req));
}

export async function createCodexAccount(input = {}) {
  const registry = await loadCodexRegistry();
  const name = String(input.name || '').trim();
  if (!name) {
    throw new Error('Account name is required');
  }

  const existingIds = new Set(registry.accounts.map((account) => account.id));
  const id = makeAccountId(name, existingIds);
  const now = new Date().toISOString();
  const account = {
    id,
    name,
    codexHome: normalizeCodexHome(input.codexHome, id),
    isDefault: false,
    createdAt: now,
    updatedAt: now,
  };

  registry.accounts.push(account);
  await fs.mkdir(account.codexHome, { recursive: true });
  await saveCodexRegistry(registry);
  return account;
}

export async function setActiveCodexAccount(accountId) {
  const registry = await loadCodexRegistry();
  const account = registry.accounts.find((entry) => entry.id === accountId);
  if (!account) {
    throw new Error(`Unknown Codex account: ${accountId}`);
  }

  registry.activeAccountId = account.id;
  await saveCodexRegistry(registry);
  return account;
}

export async function deleteCodexAccount(accountId) {
  if (accountId === DEFAULT_ACCOUNT_ID) {
    throw new Error('The default Codex account cannot be deleted');
  }

  const registry = await loadCodexRegistry();
  const existing = registry.accounts.find((account) => account.id === accountId);
  if (!existing) {
    throw new Error(`Unknown Codex account: ${accountId}`);
  }

  registry.accounts = registry.accounts.filter((account) => account.id !== accountId);
  if (registry.activeAccountId === accountId) {
    registry.activeAccountId = DEFAULT_ACCOUNT_ID;
  }

  await saveCodexRegistry(registry);
  return existing;
}

export function buildCodexEnvironment(account, extraEnv = {}) {
  return {
    ...process.env,
    ...extraEnv,
    CODEX_HOME: account.codexHome,
  };
}

export {
  CODEX_ACCOUNTS_DIR,
  DEFAULT_ACCOUNT_ID,
  getLegacyCodexHome,
  loadCodexRegistry,
  saveCodexRegistry,
};
