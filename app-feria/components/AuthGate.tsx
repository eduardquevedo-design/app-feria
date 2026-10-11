"use client";
import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { GoogleAuthProvider, createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";

const UserCtx = createContext<User | null>(null);
export function useUser() {
  const u = useContext(UserCtx);
  if (!u) throw new Error("No hay sesión iniciada");
  return u;
}

const field = "w-full rounded-lg border border-ink/25 bg-white px-3 py-3 text-base";

export default function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  if (user === undefined) return <p className="p-6">Cargando…</p>;
  if (user) return <UserCtx.Provider value={user}>{children}</UserCtx.Provider>;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (creating) await createUserWithEmailAndPassword(auth, email, password);
      else await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError(creating ? "No pudimos crear la cuenta. Usá un email válido y una contraseña de 6 caracteres o más." : "No pudimos entrar. Revisá el email y la contraseña.");
    }
  }

  async function google() {
    setError("");
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch {
      setError("No pudimos entrar con Google. Probá de nuevo.");
    }
  }

  return (
    <div className="mx-auto min-h-dvh max-w-sm">
      <div className="awning h-3" />
      <form onSubmit={submit} className="space-y-4 p-6">
        <h1 className="text-3xl font-extrabold">Mi puesto</h1>
        <p>Ventas y stock de tu puesto, incluso sin señal.</p>
        <input type="email" required autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
        <input type="password" required autoComplete={creating ? "new-password" : "current-password"} placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
        {error && <p role="alert" className="text-alert">{error}</p>}
        <button type="submit" className="w-full rounded-xl bg-sun py-4 text-lg font-extrabold">{creating ? "Crear cuenta" : "Entrar"}</button>
        <button type="button" onClick={google} className="w-full rounded-xl border-2 border-ink py-3 font-bold">Entrar con Google</button>
        <button type="button" onClick={() => setCreating(!creating)} className="w-full text-sm underline">
          {creating ? "Ya tengo cuenta" : "Crear una cuenta nueva"}
        </button>
      </form>
    </div>
  );
}
