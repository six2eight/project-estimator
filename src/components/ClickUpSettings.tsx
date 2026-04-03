import { useState, useEffect } from 'react';
import {
    getStoredConfig,
    storeConfig,
    clearConfig,
    getAuthorizationUrl,
    exchangeCodeForToken,
    getAuthorizedUser,
    getTeams,
} from '../services/clickupApi';
import type { ClickUpOAuthConfig, ClickUpTeam } from '../services/clickupApi';
import './ClickUpSettings.css';

interface ClickUpSettingsProps {
    onClose: () => void;
    onConnectionChange: (connected: boolean) => void;
}

function ClickUpSettings({ onClose, onConnectionChange }: ClickUpSettingsProps) {
    const [config, setConfig] = useState<ClickUpOAuthConfig>({
        clientId: '',
        clientSecret: '',
        accessToken: '',
        redirectUri: window.location.origin + '/clickup-callback',
    });
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [userInfo, setUserInfo] = useState<{ username: string; email: string } | null>(null);
    const [teams, setTeams] = useState<ClickUpTeam[]>([]);
    const [usePersonalToken, setUsePersonalToken] = useState(true);
    const [personalToken, setPersonalToken] = useState('');

    useEffect(() => {
        const storedConfig = getStoredConfig();
        if (storedConfig) {
            setConfig(storedConfig);
            setIsConnected(!!storedConfig.accessToken);
            if (storedConfig.accessToken) {
                fetchUserInfo();
            }
        }

        // Check for OAuth callback code in URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        if (code) {
            handleOAuthCallback(code);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchUserInfo = async () => {
        try {
            const userResponse = await getAuthorizedUser();
            setUserInfo({
                username: userResponse.user.username,
                email: userResponse.user.email,
            });

            const teamsResponse = await getTeams();
            setTeams(teamsResponse.teams);
        } catch (err) {
            console.error('Failed to fetch user info:', err);
            setError('Failed to fetch user info. Your token may be invalid.');
        }
    };

    const handleOAuthCallback = async (code: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const storedConfig = getStoredConfig();
            if (!storedConfig?.clientId || !storedConfig?.clientSecret) {
                throw new Error('Client ID and Secret are required');
            }

            const accessToken = await exchangeCodeForToken(
                code,
                storedConfig.clientId,
                storedConfig.clientSecret
            );

            const newConfig = { ...storedConfig, accessToken };
            storeConfig(newConfig);
            setConfig(newConfig);
            setIsConnected(true);
            onConnectionChange(true);

            // Clear the code from URL
            window.history.replaceState({}, document.title, window.location.pathname);

            await fetchUserInfo();
            setSuccessMessage('Successfully connected to ClickUp!');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to complete OAuth');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePersonalTokenConnect = async () => {
        if (!personalToken.trim()) {
            setError('Please enter your Personal API Token');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Store the personal token as access token
            const newConfig: ClickUpOAuthConfig = {
                clientId: '',
                clientSecret: '',
                accessToken: personalToken.trim(),
            };

            storeConfig(newConfig);
            setConfig(newConfig);

            // Test the connection
            await fetchUserInfo();

            setIsConnected(true);
            onConnectionChange(true);
            setSuccessMessage('Successfully connected to ClickUp with Personal Token!');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to connect with Personal Token');
            clearConfig();
            setIsConnected(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOAuthConnect = () => {
        if (!config.clientId || !config.clientSecret) {
            setError('Please enter Client ID and Client Secret');
            return;
        }

        // Store config before redirecting
        storeConfig(config);

        // Redirect to ClickUp OAuth
        const authUrl = getAuthorizationUrl(config.clientId, config.redirectUri || '');
        window.location.href = authUrl;
    };

    const handleDisconnect = () => {
        clearConfig();
        setConfig({
            clientId: '',
            clientSecret: '',
            accessToken: '',
            redirectUri: window.location.origin + '/clickup-callback',
        });
        setPersonalToken('');
        setIsConnected(false);
        setUserInfo(null);
        setTeams([]);
        onConnectionChange(false);
        setSuccessMessage('Disconnected from ClickUp');
    };

    const handleSaveConfig = () => {
        storeConfig(config);
        setSuccessMessage('Configuration saved!');
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    return (
        <div className="clickup-settings-overlay">
            <div className="clickup-settings-modal">
                <div className="modal-header">
                    <h2>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                        ClickUp Integration
                    </h2>
                    <button className="close-btn" onClick={onClose}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="modal-content">
                    {error && (
                        <div className="alert alert-error">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="15" y1="9" x2="9" y2="15" />
                                <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {successMessage && (
                        <div className="alert alert-success">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                            {successMessage}
                        </div>
                    )}

                    {isConnected ? (
                        <div className="connected-section">
                            <div className="connection-status connected">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                    <polyline points="22 4 12 14.01 9 11.01" />
                                </svg>
                                Connected to ClickUp
                            </div>

                            {userInfo && (
                                <div className="user-info">
                                    <div className="info-row">
                                        <span className="label">User:</span>
                                        <span className="value">{userInfo.username}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="label">Email:</span>
                                        <span className="value">{userInfo.email}</span>
                                    </div>
                                </div>
                            )}

                            {teams.length > 0 && (
                                <div className="teams-section">
                                    <h3>Available Teams (Workspaces)</h3>
                                    <div className="teams-list">
                                        {teams.map(team => (
                                            <div key={team.id} className="team-item">
                                                <div
                                                    className="team-avatar"
                                                    style={{ backgroundColor: team.color || '#6366f1' }}
                                                >
                                                    {team.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="team-details">
                                                    <div className="team-name">{team.name}</div>
                                                    <div className="team-members">
                                                        {team.members.length} member{team.members.length !== 1 ? 's' : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button className="btn btn-danger" onClick={handleDisconnect}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                    <polyline points="16 17 21 12 16 7" />
                                    <line x1="21" y1="12" x2="9" y2="12" />
                                </svg>
                                Disconnect
                            </button>
                        </div>
                    ) : (
                        <div className="connection-form">
                            <div className="auth-method-tabs">
                                <button
                                    className={`tab ${usePersonalToken ? 'active' : ''}`}
                                    onClick={() => setUsePersonalToken(true)}
                                >
                                    Personal Token
                                </button>
                                <button
                                    className={`tab ${!usePersonalToken ? 'active' : ''}`}
                                    onClick={() => setUsePersonalToken(false)}
                                >
                                    OAuth (Client ID & Secret)
                                </button>
                            </div>

                            {usePersonalToken ? (
                                <div className="form-section">
                                    <div className="form-info">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="12" y1="16" x2="12" y2="12" />
                                            <line x1="12" y1="8" x2="12.01" y2="8" />
                                        </svg>
                                        <span>
                                            Get your Personal Token from{' '}
                                            <a href="https://app.clickup.com/settings/apps" target="_blank" rel="noopener noreferrer">
                                                ClickUp Settings → Apps
                                            </a>
                                        </span>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="personal-token">Personal API Token</label>
                                        <input
                                            id="personal-token"
                                            type="password"
                                            placeholder="pk_XXXXXXXX..."
                                            value={personalToken}
                                            onChange={(e) => setPersonalToken(e.target.value)}
                                        />
                                    </div>

                                    <button
                                        className="btn btn-primary btn-full"
                                        onClick={handlePersonalTokenConnect}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <>
                                                <span className="spinner"></span>
                                                Connecting...
                                            </>
                                        ) : (
                                            <>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                                                    <polyline points="10 17 15 12 10 7" />
                                                    <line x1="15" y1="12" x2="3" y2="12" />
                                                </svg>
                                                Connect with Personal Token
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <div className="form-section">
                                    <div className="form-info">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="12" y1="16" x2="12" y2="12" />
                                            <line x1="12" y1="8" x2="12.01" y2="8" />
                                        </svg>
                                        <span>
                                            Create an OAuth app in{' '}
                                            <a href="https://app.clickup.com/settings/apps" target="_blank" rel="noopener noreferrer">
                                                ClickUp Settings → Apps → Create new app
                                            </a>
                                        </span>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="client-id">Client ID</label>
                                        <input
                                            id="client-id"
                                            type="text"
                                            placeholder="Enter your Client ID"
                                            value={config.clientId}
                                            onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="client-secret">Client Secret</label>
                                        <input
                                            id="client-secret"
                                            type="password"
                                            placeholder="Enter your Client Secret"
                                            value={config.clientSecret}
                                            onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="redirect-uri">Redirect URI</label>
                                        <input
                                            id="redirect-uri"
                                            type="text"
                                            value={config.redirectUri}
                                            onChange={(e) => setConfig({ ...config, redirectUri: e.target.value })}
                                            placeholder="https://your-app.com/callback"
                                        />
                                        <small>Add this URL to your ClickUp OAuth app's redirect URIs</small>
                                    </div>

                                    <div className="button-group">
                                        <button className="btn btn-secondary" onClick={handleSaveConfig}>
                                            Save Config
                                        </button>
                                        <button
                                            className="btn btn-primary"
                                            onClick={handleOAuthConnect}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <>
                                                    <span className="spinner"></span>
                                                    Connecting...
                                                </>
                                            ) : (
                                                <>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                                                        <polyline points="10 17 15 12 10 7" />
                                                        <line x1="15" y1="12" x2="3" y2="12" />
                                                    </svg>
                                                    Connect with OAuth
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ClickUpSettings;
