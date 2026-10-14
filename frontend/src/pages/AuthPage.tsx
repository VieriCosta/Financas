import { FormEvent, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Fingerprint,
  Loader2,
  LockKeyhole,
  Mail,
  Orbit,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

type AuthMode = "login" | "register" | "forgot" | "reset";

export function AuthPage() {
  const { login, register } = useAuth();
  const resetToken = new URLSearchParams(window.location.search).get(
    "resetToken",
  );
  const [mode, setMode] = useState<AuthMode>(resetToken ? "reset" : "login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);

    try {
      if (mode === "register") {
        await register(
          String(form.get("name")),
          String(form.get("email")),
          String(form.get("password")),
        );
      } else if (mode === "forgot") {
        const { data } = await api.post("/auth/forgot-password", {
          email: form.get("email"),
        });
        setMessage(
          data.resetUrl
            ? `SMTP não configurado. Link de teste: ${data.resetUrl}`
            : "Se o e-mail existir, enviaremos um link para redefinir sua senha.",
        );
      } else if (mode === "reset") {
        await api.post("/auth/reset-password", {
          token: resetToken,
          password: form.get("password"),
        });
        window.history.replaceState({}, "", window.location.pathname);
        setMode("login");
        setMessage("Senha alterada com sucesso. Entre com a nova senha.");
      } else {
        await login(String(form.get("email")), String(form.get("password")));
      }
    } catch {
      setError(
        mode === "forgot"
          ? "Não foi possível enviar o link agora."
          : mode === "reset"
            ? "Não foi possível alterar a senha. O link pode ter expirado."
            : "Não foi possível autenticar. Confira os dados e tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  const title = {
    login: "Bem-vindo de volta",
    register: "Crie seu espaço",
    forgot: "Recuperar acesso",
    reset: "Nova senha",
  }[mode];

  const description = {
    login: "Seu próximo passo financeiro começa aqui.",
    register: "Tudo que você precisa para tomar decisões melhores.",
    forgot: "Enviaremos um link para o seu e-mail.",
    reset: "Escolha uma nova senha para sua conta.",
  }[mode];

  return (
    <main className="auth-shell min-h-screen text-white">
      <div className="auth-layout min-h-screen">
        <section className="auth-showcase">
          <div className="auth-brand" aria-label="Finanças Pessoais">
            <span className="brand-mark">
              <WalletCards size={24} strokeWidth={2.2} />
            </span>
            <span>
              finanças<span className="brand-dot">.</span>
            </span>
          </div>

          <div className="auth-story">
            <div className="eyebrow">
              <span className="live-pulse" /> SUA VIDA FINANCEIRA, EM OUTRA
              ÓRBITA
            </div>
            <h1>
              O futuro do seu dinheiro <span>começa com clareza.</span>
            </h1>
            <p>
              Transforme números em direção. Planeje, acompanhe e evolua com um
              espaço criado para decisões mais inteligentes.
            </p>

            <div className="auth-visual" aria-hidden="true">
              <div className="visual-grid" />
              <div className="visual-orbit orbit-one" />
              <div className="visual-orbit orbit-two" />
              <div className="visual-core">
                <Orbit size={43} strokeWidth={1.3} />
              </div>
              <div className="visual-float visual-float-top">
                <BarChart3 size={17} />
                <span>Visão completa</span>
                <ArrowUpRight size={14} />
              </div>
              <div className="visual-float visual-float-bottom">
                <Sparkles size={17} />
                <span>Próximas decisões</span>
              </div>
              <div className="visual-node node-one" />
              <div className="visual-node node-two" />
              <div className="visual-node node-three" />
            </div>

            <div className="auth-features">
              <span>
                <BarChart3 size={17} /> Dados em perspectiva
              </span>
              <span>
                <ShieldCheck size={17} /> Seu espaço privado
              </span>
              <span>
                <Sparkles size={17} /> Inteligência para agir
              </span>
            </div>
          </div>

          <div className="auth-showcase-footer">
            <span>
              FINANÇAS PESSOAIS <span className="footer-divider">/</span>{" "}
              {new Date().getFullYear()}
            </span>
            <span>CONTROLE. VISÃO. FUTURO.</span>
          </div>
        </section>

        <section className="auth-form-side">
          <div className="auth-form-top">
            <span className="live-pulse" /> AMBIENTE SEGURO{" "}
            <Fingerprint size={18} />
          </div>
          <form onSubmit={onSubmit} className="auth-card">
            <div className="auth-card-icon">
              <LockKeyhole size={23} />
            </div>
            <div className="auth-form-heading">
              <span>ACESSO À PLATAFORMA</span>
              <h2>
                {title}
                <span className="brand-dot">.</span>
              </h2>
              <p>{description}</p>
            </div>

            {mode === "register" && (
              <Field name="name" label="Nome" placeholder="Seu nome" />
            )}
            {mode !== "reset" && (
              <Field
                name="email"
                label="E-mail"
                placeholder="você@email.com"
                type="email"
              />
            )}
            {mode !== "forgot" && (
              <Field
                name="password"
                label={mode === "reset" ? "Nova senha" : "Senha"}
                placeholder="Mínimo 8 caracteres"
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
              />
            )}

            {error && (
              <p className="auth-feedback auth-error" role="alert">
                {error}
              </p>
            )}
            {message && (
              <p className="auth-feedback auth-success" role="status">
                {message}
              </p>
            )}

            <button className="auth-submit" disabled={loading}>
              {loading && <Loader2 className="animate-spin" size={18} />}
              {mode === "login" && "Entrar no painel"}
              {mode === "register" && "Criar minha conta"}
              {mode === "forgot" && (
                <>
                  <Mail size={18} /> Enviar link
                </>
              )}
              {mode === "reset" && "Alterar senha"}
              {!loading && <ArrowRight size={19} />}
            </button>

            <div className="auth-links">
              {mode === "login" ? (
                <>
                  <button type="button" onClick={() => setMode("forgot")}>
                    Esqueceu sua senha?
                  </button>
                  <button type="button" onClick={() => setMode("register")}>
                    Ainda não tem uma conta?{" "}
                    <strong>
                      Cadastre-se <ArrowUpRight size={15} />
                    </strong>
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setMode("login")}>
                  Voltar para entrar <ArrowRight size={15} />
                </button>
              )}
            </div>
          </form>
          <p className="auth-form-footer">
            <ShieldCheck size={16} /> Seus dados financeiros, sob seu controle.
          </p>
        </section>
      </div>
    </main>
  );
}

function Field({
  name,
  label,
  placeholder,
  type = "text",
  autoComplete,
}: {
  name: string;
  label: string;
  placeholder: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="auth-field">
      {label}
      <input
        required
        name={name}
        type={type}
        placeholder={placeholder}
        minLength={type === "password" ? 8 : undefined}
        autoComplete={autoComplete ?? (name === "email" ? "email" : "name")}
      />
    </label>
  );
}
