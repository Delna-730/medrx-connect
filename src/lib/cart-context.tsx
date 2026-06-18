import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface CartItem {
  medicine_id: string;
  name: string;
  manufacturer: string;
  wholesale_price: number;
  gst_percent: number;
  pack_size: string | null;
  current_stock: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  subtotal: number;
  gstAmount: number;
  total: number;
  count: number;
}

const CartCtx = createContext<CartState | undefined>(undefined);
const STORAGE_KEY = "medws_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  function add(item: Omit<CartItem, "quantity">, qty = 1) {
    setItems((prev) => {
      const existing = prev.find((p) => p.medicine_id === item.medicine_id);
      if (existing) {
        return prev.map((p) =>
          p.medicine_id === item.medicine_id
            ? { ...p, quantity: Math.min(p.current_stock, p.quantity + qty) }
            : p,
        );
      }
      return [...prev, { ...item, quantity: Math.min(item.current_stock, qty) }];
    });
  }

  function setQty(id: string, qty: number) {
    setItems((prev) =>
      prev.map((p) =>
        p.medicine_id === id
          ? { ...p, quantity: Math.max(1, Math.min(p.current_stock, qty)) }
          : p,
      ),
    );
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((p) => p.medicine_id !== id));
  }

  function clear() {
    setItems([]);
  }

  const subtotal = items.reduce((s, i) => s + i.wholesale_price * i.quantity, 0);
  const gstAmount = items.reduce(
    (s, i) => s + (i.wholesale_price * i.quantity * Number(i.gst_percent)) / 100,
    0,
  );
  const total = subtotal + gstAmount;
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartCtx.Provider value={{ items, add, setQty, remove, clear, subtotal, gstAmount, total, count }}>
      {children}
    </CartCtx.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
