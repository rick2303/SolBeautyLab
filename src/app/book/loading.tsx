export default function Loading() {
  return (
    <div
      className="min-h-screen px-4 py-8 sm:px-6 sm:py-10"
      style={{
        background:
          "radial-gradient(1200px 600px at 50% -10%,#fff8ea,#f3ecdf 60%,#ece2ce)",
      }}
    >
      <div className="mx-auto max-w-[560px]">
        <div className="skeleton mx-auto h-12 w-32" />
        <div className="skeleton mx-auto mt-3 h-4 w-48" />
        <div className="skeleton mt-8 h-2 w-full rounded-full" />
        <div className="mt-4 rounded-[18px] border border-line-2 bg-card p-5">
          <div className="grid grid-cols-2 gap-2.5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-line bg-card px-4 py-6">
                <div className="skeleton mx-auto h-8 w-8 rounded-full" />
                <div className="skeleton mx-auto mt-3 h-4 w-20" />
                <div className="skeleton mx-auto mt-2 h-2.5 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
