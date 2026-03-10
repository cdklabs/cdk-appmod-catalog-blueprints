import { useState } from "react";
import { signIn, signUp, confirmSignUp } from "../auth";

interface AuthFormProps {
  onAuthenticated: () => void;
}

type AuthMode = "signin" | "signup" | "confirm";

export default function AuthForm({ onAuthenticated }: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      await signIn(email, password);
      onAuthenticated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("User is not confirmed")) {
        setMode("confirm");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    setError("");
    try {
      await signUp(email, password);
      setMode("confirm");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError("");
    try {
      await confirmSignUp(email, confirmCode);
      await signIn(email, password);
      onAuthenticated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signin") handleSignIn();
    else if (mode === "signup") handleSignUp();
    else handleConfirm();
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>
          {mode === "signin"
            ? "Sign In"
            : mode === "signup"
              ? "Create Account"
              : "Verify Email"}
        </h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          {mode !== "confirm" ? (
            <>
              <input
                style={styles.input}
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                style={styles.input}
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </>
          ) : (
            <input
              style={styles.input}
              type="text"
              placeholder="Verification code"
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value)}
              required
            />
          )}

          {error && <p style={styles.error}>{error}</p>}

          <button style={styles.button} type="submit" disabled={loading}>
            {loading
              ? "..."
              : mode === "signin"
                ? "Sign In"
                : mode === "signup"
                  ? "Create Account"
                  : "Verify"}
          </button>
        </form>

        {mode === "signin" && (
          <p style={styles.toggle}>
            No account?{" "}
            <button style={styles.link} onClick={() => { setMode("signup"); setError(""); }}>
              Create one
            </button>
          </p>
        )}
        {mode === "signup" && (
          <p style={styles.toggle}>
            Already have an account?{" "}
            <button style={styles.link} onClick={() => { setMode("signin"); setError(""); }}>
              Sign in
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "calc(100vh - 73px)",
  },
  card: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "16px",
    padding: "32px",
    width: "100%",
    maxWidth: "380px",
  },
  title: {
    fontSize: "20px",
    fontWeight: 600,
    color: "#f1f5f9",
    marginBottom: "24px",
    textAlign: "center" as const,
  },
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
  },
  input: {
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "8px",
    color: "#e2e8f0",
    padding: "10px 14px",
    fontSize: "14px",
    fontFamily: "inherit",
    outline: "none",
  },
  button: {
    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
    border: "none",
    borderRadius: "8px",
    color: "white",
    padding: "10px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: "4px",
  },
  error: {
    color: "#f87171",
    fontSize: "13px",
    margin: 0,
  },
  toggle: {
    color: "#94a3b8",
    fontSize: "13px",
    textAlign: "center" as const,
    marginTop: "16px",
  },
  link: {
    background: "none",
    border: "none",
    color: "#38bdf8",
    cursor: "pointer",
    fontSize: "13px",
    textDecoration: "underline",
    padding: 0,
  },
};
