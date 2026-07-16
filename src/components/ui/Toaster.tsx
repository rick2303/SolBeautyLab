"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastCtx = createContext<(msg: string) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(""), 2400);
  }, []);

  return (
    <ToastCtx.Provider value={flash}>
      {children}
      {msg && (
        <div
          key={msg}
          className="anim-toast fixed bottom-6 left-1/2 z-[60] rounded-[30px] bg-espresso px-5 py-3 text-[13px] text-[#f0e9dc]"
          style={{ boxShadow: "0 16px 40px -12px rgba(0,0,0,.5)" }}
        >
          {msg}
        </div>
      )}
    </ToastCtx.Provider>
  );
}
