import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Oculta el indicador flotante de Next en dev (tapaba el botón de salir)
  devIndicators: false,
  // El comprobante de depósito de /book viaja en la reserva (imagen ya
  // reducida). Subimos el tope por defecto (1MB) para dar margen.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};

export default nextConfig;
