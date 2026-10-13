import type { ReactNode } from "react";

const IMAGEN_FONDO =
  "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=1920";

interface FondoProps {
  children: ReactNode;
}

export default function Fondo({ children }: FondoProps) {
  return (
    <div className="relative min-h-screen bg-stone-950">
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${IMAGEN_FONDO})` }}
      />
      <div aria-hidden="true" className="fixed inset-0 bg-black/70" />
      <div className="relative z-10 min-h-screen">{children}</div>
    </div>
  );
}
