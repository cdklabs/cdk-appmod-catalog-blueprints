import { useEffect, useState } from "react";
import { AppConfig, initAuth, getIdToken, getCurrentUser, signOut } from "./auth";
import AuthForm from "./components/AuthForm";
import Chat from "./components/Chat";

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    color: "#e2e8f0",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    margin: 0,
  },
  header: {
    padding: "16px 24px",
    borderBottom: "1px solid #334155",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background: "rgba(15, 23, 42, 0.8)",
    backdropFilter: "blur(8px)",
  },
  logo: {
    fontSize: "24px",
  },
  title: {
    fontSize: "20px",
    fontWeight: 700,
    margin: 0,
    background: "linear-gradient(90deg, #38bdf8, #818cf8)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: {
    fontSize: "12px",
    color: "#94a3b8",
    margin: 0,
  },
  headerRight: {
    marginLeft: "auto",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  userEmail: {
    fontSize: "13px",
    color: "#94a3b8",
  },
  signOutBtn: {
    background: "transparent",
    border: "1px solid #475569",
    borderRadius: "6px",
    color: "#94a3b8",
    padding: "4px 12px",
    fontSize: "12px",
    cursor: "pointer",
  },
  loading: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "calc(100vh - 73px)",
    color: "#94a3b8",
    fontSize: "15px",
  },
};

export default function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Load config.json deployed to the S3 bucket by CDK
  useEffect(() => {
    fetch("/config.json")
      .then((r) => r.json())
      .then((cfg: AppConfig) => {
        setConfig(cfg);
        initAuth(cfg);

        // Check if user already has a valid session
        const user = getCurrentUser();
        if (user) {
          getIdToken().then((token) => {
            if (token) {
              setAuthenticated(true);
              setUserEmail(user.getUsername());
            }
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const handleAuthenticated = () => {
    setAuthenticated(true);
    const user = getCurrentUser();
    if (user) setUserEmail(user.getUsername());
  };

  const handleSignOut = () => {
    signOut();
    setAuthenticated(false);
    setUserEmail(null);
  };

  if (loading) {
    return (
      <div style={styles.app}>
        <div style={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <span style={styles.logo}>&#x1F4C8;</span>
        <div>
          <h1 style={styles.title}>Stock Market Analyst</h1>
          <p style={styles.subtitle}>
            Powered by Amazon Bedrock &mdash; Real-time data from Yahoo Finance
          </p>
        </div>
        {authenticated && (
          <div style={styles.headerRight}>
            <span style={styles.userEmail}>{userEmail}</span>
            <button style={styles.signOutBtn} onClick={handleSignOut}>
              Sign Out
            </button>
          </div>
        )}
      </header>

      {!config ? (
        <div style={styles.loading}>
          Failed to load configuration. Make sure config.json is deployed.
        </div>
      ) : !authenticated ? (
        <AuthForm onAuthenticated={handleAuthenticated} />
      ) : (
        <Chat apiEndpoint={config.apiEndpoint} getIdToken={getIdToken} />
      )}
    </div>
  );
}
