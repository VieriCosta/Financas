import { FormEvent, useEffect, useState } from "react";
import axios from "axios";

import { KeyRound, Mail, Save } from "lucide-react";
import { api } from "../api/client";

import { User } from "../types/finance";
import { dateLabel } from "../utils/format";

import { Panel, SubmitButton, getApiErrorMessage, Input } from "./FinanceUI";

export function ProfileView({
  user,
  onUserUpdate,
  notify,
}: {
  user: User | null;
  onUserUpdate: (user: User) => void;
  notify: (type: "success" | "error", message: string) => void;
}) {
  const [profile, setProfile] = useState<User | null>(user);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    api
      .get<User>("/profile")
      .then(({ data }) => {
        setProfile(data);
        setName(data.name);
        setEmail(data.email);
        onUserUpdate(data);
      })
      .catch(() => undefined);
  }, []);

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSavingProfile(true);
      const { data } = await api.patch<User>("/profile", {
        name,
        email,
        currentPassword: currentPassword || undefined,
      });
      setProfile(data);
      setCurrentPassword("");
      onUserUpdate(data);
      notify("success", "Dados do perfil atualizados.");
    } catch (error) {
      notify(
        "error",
        getApiErrorMessage(error, "Não foi possível atualizar seus dados."),
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const newPassword = String(form.get("newPassword"));

    if (newPassword !== String(form.get("passwordConfirmation"))) {
      notify("error", "A confirmação da nova senha não confere.");
      return;
    }

    try {
      setSavingPassword(true);
      await api.patch("/profile/password", {
        currentPassword: form.get("currentPassword"),
        newPassword,
      });
      const { data } = await api.get("/auth/session");
      sessionStorage.setItem("finance.csrf", data.csrfToken);
      formElement.reset();
      notify("success", "Senha alterada com sucesso.");
    } catch (error) {
      notify(
        "error",
        getApiErrorMessage(error, "Não foi possível alterar sua senha."),
      );
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
      <Panel title="Sua conta">
        <div className="grid gap-5">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-blue-100 text-2xl font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
              {profile?.name.slice(0, 1).toUpperCase() ?? "U"}
            </span>
            <div>
              <p className="text-lg font-semibold">{profile?.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {profile?.email}
              </p>
            </div>
          </div>
          <div className="grid gap-3 border-t border-slate-100 pt-5 text-sm dark:border-slate-800">
            <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <Mail size={17} /> {profile?.email}
            </p>
            {profile?.createdAt && (
              <p className="text-slate-500 dark:text-slate-400">
                Conta criada em {dateLabel(profile.createdAt)}
              </p>
            )}
          </div>
        </div>
      </Panel>

      <div className="grid gap-5">
        <Panel title="Dados pessoais">
          <form onSubmit={submitProfile} className="grid gap-3 sm:grid-cols-2">
            <Input
              name="name"
              placeholder="Seu nome"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Input
              name="email"
              placeholder="você@email.com"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Input
              required={false}
              name="currentPassword"
              placeholder="Senha atual, caso altere o e-mail"
              type="password"
              minLength={8}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
            <div className="sm:col-span-2 sm:justify-self-start">
              <SubmitButton disabled={savingProfile}>
                <Save size={18} /> Salvar dados
              </SubmitButton>
            </div>
          </form>
        </Panel>

        <Panel title="Alterar senha">
          <form onSubmit={submitPassword} className="grid gap-3 sm:grid-cols-2">
            <Input
              name="currentPassword"
              placeholder="Senha atual"
              type="password"
              minLength={8}
            />
            <span className="hidden sm:block" />
            <Input
              name="newPassword"
              placeholder="Nova senha"
              type="password"
              minLength={8}
            />
            <Input
              name="passwordConfirmation"
              placeholder="Confirmar nova senha"
              type="password"
              minLength={8}
            />
            <div className="sm:col-span-2 sm:justify-self-start">
              <SubmitButton disabled={savingPassword}>
                <KeyRound size={18} /> Alterar senha
              </SubmitButton>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}
