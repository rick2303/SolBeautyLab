"use client";

// Se re-monta en cada navegación → anima la entrada de cada página
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="anim-page">{children}</div>;
}
