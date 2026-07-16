import Link from "next/link";
import { SolLogo } from "@/components/SolLogo";

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{
        background:
          "radial-gradient(1200px 600px at 50% -10%,#fff8ea,#f3ecdf 60%,#ece2ce)",
      }}
    >
      <div className="anim-scale w-[400px] max-w-full rounded-[22px] border border-line-2 bg-card p-8 text-center">
        <SolLogo size="sm" />
        <div className="mt-5 font-serif text-[64px] font-bold leading-none text-gold-grad">
          404
        </div>
        <div className="mt-2 font-serif text-xl font-semibold">
          This page doesn&apos;t exist
        </div>
        <p className="mt-1.5 text-[13px] text-muted">
          Esta página no existe · The link may be old or mistyped.
        </p>
        <Link
          href="/dashboard"
          className="grad-gold mt-6 inline-flex h-11 w-full items-center justify-center rounded-[14px] text-sm font-medium text-white"
          style={{ boxShadow: "0 12px 24px -12px rgba(138,101,38,.9)" }}
        >
          Back to the studio
        </Link>
      </div>
    </div>
  );
}
