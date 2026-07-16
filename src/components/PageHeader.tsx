export function PageHeader({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-[22px] flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-serif text-2xl font-semibold leading-none sm:text-3xl">
          {title}
        </h1>
        <div className="mt-1 text-[12.5px] text-muted">{sub}</div>
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2.5">{children}</div>
      )}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-line bg-card ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  gold = false,
  hintColor,
}: {
  label: string;
  value: string;
  hint?: string;
  gold?: boolean;
  hintColor?: string;
}) {
  return (
    <div
      className={`rounded-[14px] p-4 ${
        gold ? "grad-gold-rev text-white" : "border border-line bg-card"
      }`}
    >
      <div
        className={`text-[10.5px] uppercase tracking-[0.08em] ${
          gold ? "text-[#f3e6c8]" : "text-subtle"
        }`}
      >
        {label}
      </div>
      <div className="mt-1.5 font-serif text-[27px] font-semibold">{value}</div>
      {hint && (
        <div
          className="mt-0.5 text-[10.5px]"
          style={{ color: gold ? "#f3e6c8" : hintColor ?? "#b3a893" }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}
