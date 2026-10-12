"use client";
import { useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, increment, onSnapshot, query, updateDoc, where, writeBatch } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { toThumb } from "@/lib/image";
import { useUser } from "./AuthGate";

// Cambiá la moneda y el idioma acá.
const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format;

type Product = { id: string; name: string; price: number; stock: number; min: number; img?: string };
type Sale = { id: string; at: number; total: number; items: { id: string; name: string; price: number; qty: number }[] };
type Tab = "vender" | "productos" | "hoy";
const TABS: [Tab, string][] = [["vender", "Vender"], ["productos", "Productos"], ["hoy", "Hoy"]];
const field = "w-full rounded-lg border border-ink/25 bg-white px-3 py-3 text-base";
const empty = { name: "", price: "", stock: "", min: "0" };

export default function Feria() {
  const { uid } = useUser();
  const [tab, setTab] = useState<Tab>("vender");
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [f, setF] = useState(empty);
  const [confirmId, setConfirmId] = useState("");
  const [fImg, setFImg] = useState("");
  const [fKey, setFKey] = useState(0);

  useEffect(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const u1 = onSnapshot(collection(db, "users", uid, "products"), (s) =>
      setProducts(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Product, "id">) })).sort((a, b) => a.name.localeCompare(b.name))));
    const u2 = onSnapshot(query(collection(db, "users", uid, "sales"), where("at", ">=", start.getTime())), (s) =>
      setSales(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Sale, "id">) })).sort((a, b) => b.at - a.at)));
    return () => { u1(); u2(); };
  }, [uid]);

  const lines = products.filter((p) => cart[p.id]).map((p) => ({ ...p, qty: cart[p.id] }));
  const total = lines.reduce((a, l) => a + l.price * l.qty, 0);
  const count = lines.reduce((a, l) => a + l.qty, 0);

  function charge() {
    const batch = writeBatch(db);
    batch.set(doc(collection(db, "users", uid, "sales")), { at: Date.now(), total, items: lines.map(({ id, name, price, qty }) => ({ id, name, price, qty })) });
    lines.forEach((l) => batch.update(doc(db, "users", uid, "products", l.id), { stock: increment(-l.qty) }));
    // Sin señal el commit queda pendiente y se sincroniza solo, por eso no se espera.
    batch.commit().catch(console.error);
    setCart({});
  }

  function addProduct() {
    const price = Number(f.price), stock = Number(f.stock), min = Number(f.min || 0);
    if (!f.name.trim() || !(price > 0) || f.stock === "" || !(stock >= 0) || !(min >= 0)) return;
    addDoc(collection(db, "users", uid, "products"), { name: f.name.trim(), price, stock, min, ...(fImg ? { img: fImg } : {}) }).catch(console.error);
    setF(empty);
    setFImg("");
    setFKey((k) => k + 1);
  }

  const editNum = (p: Product, key: "price" | "stock", raw: string) => {
    const v = Number(raw);
    if (raw === "" || v === p[key] || (key === "price" ? !(v > 0) : !(v >= 0))) return;
    updateDoc(doc(db, "users", uid, "products", p.id), { [key]: v }).catch(console.error);
  };

  const totalHoy = sales.reduce((a, s) => a + s.total, 0);
  const units: Record<string, { name: string; qty: number }> = {};
  sales.forEach((s) => s.items.forEach((i) => {
    if (!units[i.id]) units[i.id] = { name: i.name, qty: 0 };
    units[i.id].qty += i.qty;
  }));
  const low = products.filter((p) => p.stock <= p.min);

  return (
    <div className="mx-auto min-h-dvh max-w-xl pb-40">
      <div className="awning h-3" />
      <header className="flex items-center justify-between px-4 py-3">
        <h1 className="text-2xl font-extrabold">Mi puesto</h1>
        <button onClick={() => signOut(auth)} className="px-2 py-2 text-sm underline">Salir</button>
      </header>

      {tab === "vender" && (
        <main className="px-4">
          {products.length === 0 ? (
            <p className="py-8">Todavía no cargaste productos. <button onClick={() => setTab("productos")} className="font-bold underline">Agregá el primero</button> para empezar a vender.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {products.map((p) => {
                const q = cart[p.id] ?? 0;
                const out = p.stock <= 0;
                return (
                  <div key={p.id} className="relative">
                    <button disabled={out || q >= p.stock} onClick={() => setCart((c) => ({ ...c, [p.id]: (c[p.id] ?? 0) + 1 }))}
                      className={`flex w-full flex-col gap-2 rounded-xl border-2 p-2 text-left disabled:opacity-40 ${q ? "border-awning bg-awning/10" : "border-ink/20 bg-white"}`}>
                      <span className="block h-24 w-full overflow-hidden rounded-lg bg-awning/10">
                        {p.img ? <img src={p.img} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-4xl font-extrabold text-awning/50">{p.name.charAt(0).toUpperCase()}</span>}
                      </span>
                      <span className="px-1 text-base font-bold leading-tight">{p.name}</span>
                      <span className="flex items-end justify-between px-1">
                        <span className="text-xl font-extrabold">{money(p.price)}</span>
                        <span className={`text-xs ${p.stock <= p.min ? "font-bold text-alert" : ""}`}>{out ? "Sin stock" : `Quedan ${p.stock}`}</span>
                      </span>
                    </button>
                    {q > 0 && (
                      <button aria-label={`Quitar uno de ${p.name}`}
                        onClick={() => setCart((c) => { const n = { ...c }; if (n[p.id] > 1) n[p.id]--; else delete n[p.id]; return n; })}
                        className="absolute right-2 top-2 flex h-9 items-center gap-1 rounded-full bg-ink px-3 text-sm font-bold text-white">
                        <span>{q}</span><span aria-hidden>−</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {tab === "productos" && (
        <main className="space-y-6 px-4">
          <section className="space-y-3 rounded-xl bg-white p-4">
            <h2 className="text-lg font-bold">Nuevo producto</h2>
            <input placeholder="Nombre" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={field} />
            <div className="grid grid-cols-3 gap-2">
              <label className="text-sm">Precio<input inputMode="numeric" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} className={field} /></label>
              <label className="text-sm">Stock<input inputMode="numeric" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} className={field} /></label>
              <label className="text-sm">Avisar con<input inputMode="numeric" value={f.min} onChange={(e) => setF({ ...f, min: e.target.value })} className={field} /></label>
            </div>
            <label className="flex items-center gap-3 text-sm">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-awning/10">{fImg ? <img src={fImg} alt="" className="h-full w-full object-cover" /> : "Sin foto"}</span>
              <span className="flex-1">Foto (opcional)<input key={fKey} type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) toThumb(file).then(setFImg).catch(console.error); }} className="mt-1 block w-full text-base" /></span>
            </label>
            <button onClick={addProduct} className="w-full rounded-xl bg-sun py-3 text-lg font-extrabold">Agregar producto</button>
          </section>
          <ul className="space-y-3">
            {products.map((p) => (
              <li key={p.id} className="space-y-2 rounded-xl bg-white p-4">
                <div className="flex items-center gap-3">
                  <label className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-awning/10 text-xs font-bold text-awning">
                    {p.img ? <img src={p.img} alt={`Cambiar foto de ${p.name}`} className="h-full w-full object-cover" /> : "Agregar foto"}
                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) toThumb(file).then((img) => updateDoc(doc(db, "users", uid, "products", p.id), { img })).catch(console.error); }} />
                  </label>
                  <p className="font-bold">{p.name}</p>
                </div>
                <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                  <label className="text-sm">Precio<input key={`${p.id}-${p.price}`} inputMode="numeric" defaultValue={p.price} onBlur={(e) => editNum(p, "price", e.target.value)} className={field} /></label>
                  <label className="text-sm">Stock<input key={`${p.id}-${p.stock}`} inputMode="numeric" defaultValue={p.stock} onBlur={(e) => editNum(p, "stock", e.target.value)} className={field} /></label>
                  {confirmId === p.id ? (
                    <button onClick={() => { deleteDoc(doc(db, "users", uid, "products", p.id)).catch(console.error); setConfirmId(""); }} className="rounded-lg bg-alert px-3 py-3 font-bold text-white">Confirmar</button>
                  ) : (
                    <button onClick={() => setConfirmId(p.id)} className="rounded-lg border-2 border-ink/25 px-3 py-3 font-bold">Borrar</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </main>
      )}

      {tab === "hoy" && (
        <main className="space-y-6 px-4">
          <section>
            <p className="text-sm">Vendido hoy</p>
            <p className="text-5xl font-extrabold">{money(totalHoy)}</p>
            <p>{sales.length} {sales.length === 1 ? "venta" : "ventas"}</p>
          </section>
          {sales.length === 0 ? <p>Todavía no vendiste nada hoy. Las ventas que cobres aparecen acá.</p> : (
            <section>
              <h2 className="mb-2 text-lg font-bold">Unidades vendidas</h2>
              <ul className="divide-y divide-ink/15 rounded-xl bg-white">
                {Object.values(units).sort((a, b) => b.qty - a.qty).map((u) => (
                  <li key={u.name} className="flex justify-between px-4 py-3"><span>{u.name}</span><b>{u.qty}</b></li>
                ))}
              </ul>
            </section>
          )}
          {low.length > 0 && (
            <section>
              <h2 className="mb-2 text-lg font-bold text-alert">Stock bajo</h2>
              <ul className="divide-y divide-ink/15 rounded-xl bg-white">
                {low.map((p) => <li key={p.id} className="flex justify-between px-4 py-3"><span>{p.name}</span><b>{p.stock}</b></li>)}
              </ul>
            </section>
          )}
        </main>
      )}

      {tab === "vender" && count > 0 && (
        <div className="fixed inset-x-0 bottom-16 mx-auto flex max-w-xl items-center gap-3 border-t-2 border-ink bg-white p-3">
          <div className="flex-1">
            <p className="text-sm">{count} {count === 1 ? "unidad" : "unidades"}</p>
            <p className="text-2xl font-extrabold">{money(total)}</p>
          </div>
          <button onClick={() => setCart({})} className="px-3 py-3 text-sm underline">Vaciar</button>
          <button onClick={charge} className="rounded-xl bg-sun px-6 py-4 text-lg font-extrabold">Cobrar</button>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 mx-auto grid h-16 max-w-xl grid-cols-3 border-t border-ink/20 bg-white">
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`text-base font-bold ${tab === key ? "bg-ink text-white" : ""}`}>{label}</button>
        ))}
      </nav>
    </div>
  );
}
