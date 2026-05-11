import { FormEvent, useState } from "react";
import { Loader2, LockKeyhole, Mail, WalletCards } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

type AuthMode = "login" | "register" | "forgot" | "reset";

export function AuthPage() {
  const { login, register } = useAuth();
  const resetToken = new URLSearchParams(window.location.search).get("resetToken");
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
        await register(String(form.get("name")), String(form.get("email")), String(form.get("password")));
      } else if (mode === "forgot") {
        const { data } = await api.post("/auth/forgot-password", { email: form.get("email") });
        setMessage(data.resetUrl ? `SMTP nao configurado. Link de teste: ${data.resetUrl}` : "Se o e-mail existir, enviaremos um link para redefinir sua senha.");
      } else if (mode === "reset") {
        await api.post("/auth/reset-password", {
          token: resetToken,
          password: form.get("password")
        });
        window.history.replaceState({}, "", window.location.pathname);
        setMode("login");
        setMessage("Senha alterada com sucesso. Entre com a nova senha.");
      } else {
        await login(String(form.get("email")), String(form.get("password")));
      }
    } catch {
      setError(mode === "forgot" ? "Nao foi possivel enviar o link agora." : mode === "reset" ? "Nao foi possivel alterar a senha. O link pode ter expirado." : "Nao foi possivel autenticar. Confira os dados e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const title = {
    login: "Entrar",
    register: "Criar conta",
    forgot: "Recuperar senha",
    reset: "Alterar senha"
  }[mode];

  const description = {
    login: "Acesso privado ao seu painel financeiro.",
    register: "Crie seu acesso privado.",
    forgot: "Informe seu e-mail para receber o link.",
    reset: "Defina uma nova senha para sua conta."
  }[mode];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col justify-between px-6 py-8 sm:px-10 lg:px-16">
          <div className="flex items-center gap-3 text-lg font-semibold">
            <span className="grid h-11 w-11 place-items-center rounded-lg bg-blue-500">
              <WalletCards size={24} />
            </span>
            Financas Pessoais
          </div>
          <div className="max-w-2xl py-12">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">Private finance OS</p>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">Controle sua vida financeira com clareza.</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Dashboard, agenda, metas, investimentos, filtros e relatorios em uma experiencia rapida, privada e organizada.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-slate-400 sm:grid-cols-3">
            <span>JWT seguro</span>
            <span>PostgreSQL</span>
            <span>Deploy online</span>
          </div>
        </section>

        <section className="flex items-center justify-center bg-slate-50 px-6 py-10 text-slate-950 dark:bg-slate-900 dark:text-white">
          <form onSubmit={onSubmit} className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-6 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                <LockKeyhole size={20} />
              </span>
              <div>
                <h2 className="text-xl font-semibold">{title}</h2>
                <p className="text-sm text-slate-500">{description}</p>
              </div>
            </div>

            {mode === "register" && <Field name="name" label="Nome" placeholder="Seu nome" />}
            {mode !== "reset" && <Field name="email" label="E-mail" placeholder="voce@email.com" type="email" />}
            {mode !== "forgot" && <Field name="password" label={mode === "reset" ? "Nova senha" : "Senha"} placeholder="Minimo 8 caracteres" type="password" />}

            {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
            {message && <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{message}</p>}

            <button className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 font-semibold text-white transition hover:bg-blue-700" disabled={loading}>
              {loading && <Loader2 className="animate-spin" size={18} />}
              {mode === "login" && "Acessar dashboard"}
              {mode === "register" && "Cadastrar"}
              {mode === "forgot" && <><Mail size={18} /> Enviar link</>}
              {mode === "reset" && "Alterar senha"}
            </button>

            <div className="mt-4 grid gap-2 text-center text-sm">
              {mode === "login" && (
                <>
                  <button type="button" onClick={() => setMode("forgot")} className="font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-300">Esqueceu sua senha?</button>
                  <button type="button" onClick={() => setMode("register")} className="font-medium text-blue-600 dark:text-blue-300">Ainda nao tenho conta</button>
                </>
              )}
              {mode !== "login" && (
                <button type="button" onClick={() => setMode("login")} className="font-medium text-blue-600 dark:text-blue-300">Voltar para entrar</button>
              )}
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function Field({ name, label, placeholder, type = "text" }: { name: string; label: string; placeholder: string; type?: string }) {
  return (
    <label className="mb-4 block text-sm font-medium">
      {label}
      <input
        required
        name={name}
        type={type}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900"
      />
    </label>
  );
}
