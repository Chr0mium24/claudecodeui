import { useEffect, useMemo, useState } from 'react';
import type { RefObject } from 'react';
import type { AuthCopyStatus } from '../../types/types';
import { resolveAuthUrlForDisplay } from '../../utils/auth';

type ShellMinimalViewProps = {
  terminalContainerRef: RefObject<HTMLDivElement>;
  authUrl: string;
  authCode: string;
  authUrlVersion: number;
  initialCommand: string | null | undefined;
  isConnected: boolean;
  hideTerminalOutput?: boolean;
  openAuthUrlInBrowser: (url: string) => boolean;
  copyAuthUrlToClipboard: (url: string) => Promise<boolean>;
};

export default function ShellMinimalView({
  terminalContainerRef,
  authUrl,
  authCode,
  authUrlVersion,
  initialCommand,
  isConnected,
  hideTerminalOutput = false,
  openAuthUrlInBrowser,
  copyAuthUrlToClipboard,
}: ShellMinimalViewProps) {
  const [authUrlCopyStatus, setAuthUrlCopyStatus] = useState<AuthCopyStatus>('idle');
  const [authCodeCopyStatus, setAuthCodeCopyStatus] = useState<AuthCopyStatus>('idle');
  const [isAuthPanelHidden, setIsAuthPanelHidden] = useState(false);

  const displayAuthUrl = useMemo(
    () => resolveAuthUrlForDisplay(initialCommand, authUrl),
    [authUrl, initialCommand],
  );

  // Keep auth panel UI state local to minimal mode and reset it when connection/url changes.
  useEffect(() => {
    setAuthUrlCopyStatus('idle');
    setAuthCodeCopyStatus('idle');
    setIsAuthPanelHidden(false);
  }, [authCode, authUrlVersion, displayAuthUrl, isConnected]);

  const hasAuthUrl = Boolean(displayAuthUrl);
  const hasAuthCode = Boolean(authCode);
  const showMobileAuthPanel = hasAuthUrl && !isAuthPanelHidden;
  const showMobileAuthPanelToggle = hasAuthUrl && isAuthPanelHidden;

  if (hideTerminalOutput) {
    return (
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gray-950 p-6">
        <div
          ref={terminalContainerRef}
          className="pointer-events-none absolute inset-0 opacity-0"
          aria-hidden="true"
          style={{ outline: 'none' }}
        />

        <div className="relative z-10 w-full max-w-xl rounded-2xl border border-gray-800 bg-gray-900/95 p-6 shadow-2xl">
          <div className="mb-6">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-400">Codex Login</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Sign in with ChatGPT</h3>
            <p className="mt-2 text-sm text-gray-300">
              Open the official login page, finish sign-in, and come back here. The app will keep waiting in the background.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-4">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">1</div>
                <p className="text-sm font-medium text-white">Open the login page</p>
              </div>
              <input
                type="text"
                value={displayAuthUrl}
                readOnly
                onClick={(event) => event.currentTarget.select()}
                className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                aria-label="Authentication URL"
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    openAuthUrlInBrowser(displayAuthUrl);
                  }}
                  className="flex-1 rounded bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
                >
                  Open URL
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const copied = await copyAuthUrlToClipboard(displayAuthUrl);
                    setAuthUrlCopyStatus(copied ? 'copied' : 'failed');
                  }}
                  className="flex-1 rounded bg-gray-800 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700"
                >
                  {authUrlCopyStatus === 'copied' ? 'Copied' : 'Copy URL'}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-4">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">2</div>
                <p className="text-sm font-medium text-white">Enter the device code</p>
              </div>
              <div className="rounded border border-dashed border-gray-700 bg-gray-900 px-3 py-3 text-center font-mono text-lg tracking-[0.24em] text-white">
                {hasAuthCode ? authCode : 'Waiting for code...'}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={!hasAuthCode}
                  onClick={async () => {
                    const copied = await copyAuthUrlToClipboard(authCode);
                    setAuthCodeCopyStatus(copied ? 'copied' : 'failed');
                  }}
                  className="rounded bg-gray-800 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {authCodeCopyStatus === 'copied' ? 'Copied' : 'Copy code'}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-4 text-sm text-gray-300">
              {isConnected ? 'Waiting for login to complete...' : 'Preparing login session...'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-gray-900">
      <div
        ref={terminalContainerRef}
        className="h-full w-full focus:outline-none"
        style={{ outline: 'none' }}
      />

      {showMobileAuthPanel && (
        <div className="absolute inset-x-0 bottom-14 z-20 border-t border-gray-700/80 bg-gray-900/95 p-3 backdrop-blur-sm md:bottom-4 md:left-auto md:right-4 md:w-[28rem] md:rounded-lg md:border">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-white">OpenAI Login</p>
                <p className="text-xs text-gray-300">Open or copy the login URL to continue.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAuthPanelHidden(true)}
                className="rounded bg-gray-700 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-gray-100 hover:bg-gray-600"
              >
                Hide
              </button>
            </div>

            <input
              type="text"
              value={displayAuthUrl}
              readOnly
              onClick={(event) => event.currentTarget.select()}
              className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="Authentication URL"
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  openAuthUrlInBrowser(displayAuthUrl);
                }}
                className="flex-1 rounded bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
              >
                Open URL
              </button>

              <button
                type="button"
                onClick={async () => {
                  const copied = await copyAuthUrlToClipboard(displayAuthUrl);
                  setAuthUrlCopyStatus(copied ? 'copied' : 'failed');
                }}
                className="flex-1 rounded bg-gray-700 px-3 py-2 text-xs font-medium text-white hover:bg-gray-600"
              >
                {authUrlCopyStatus === 'copied' ? 'Copied' : 'Copy URL'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMobileAuthPanelToggle && (
        <div className="absolute bottom-14 right-3 z-20 md:bottom-4 md:right-4">
          <button
            type="button"
            onClick={() => setIsAuthPanelHidden(false)}
            className="rounded bg-gray-800/95 px-3 py-2 text-xs font-medium text-gray-100 shadow-lg backdrop-blur-sm hover:bg-gray-700"
          >
            Show login URL
          </button>
        </div>
      )}
    </div>
  );
}
