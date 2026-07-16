export default function Loading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-[22px]">
        <div className="skeleton h-8 w-56" />
        <div className="skeleton mt-2 h-3.5 w-72" />
      </div>
      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-[14px] border border-line bg-card p-4">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton mt-3 h-7 w-20" />
            <div className="skeleton mt-2 h-2.5 w-16" />
          </div>
        ))}
      </div>
      {/* Body */}
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[1.35fr_1fr]">
        <div className="rounded-2xl border border-line bg-card p-[18px]">
          <div className="skeleton mb-4 h-5 w-44" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3.5 py-3">
              <div className="skeleton h-[34px] w-[52px]" />
              <div className="flex-1">
                <div className="skeleton h-3.5 w-2/5" />
                <div className="skeleton mt-1.5 h-2.5 w-3/5" />
              </div>
              <div className="skeleton h-6 w-16 rounded-[20px]" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-[18px]">
          <div className="rounded-2xl border border-line bg-card p-[18px]">
            <div className="skeleton mb-4 h-5 w-40" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="mb-3">
                <div className="skeleton h-3 w-3/4" />
                <div className="skeleton mt-1.5 h-1.5 w-full" />
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-line bg-card p-[18px]">
            <div className="skeleton mb-4 h-5 w-24" />
            <div className="skeleton h-8 w-32" />
            <div className="skeleton mt-3.5 h-2 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
