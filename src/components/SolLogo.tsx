export function SolLogo({ size = "lg" }: { size?: "sm" | "lg" }) {
  const big = size === "lg";
  return (
    <div className="text-center">
      {big && (
        <div className="relative mx-auto mb-1.5" style={{ width: 66, height: 34 }}>
          <div
            className="absolute left-1/2 bottom-0 -translate-x-1/2"
            style={{
              width: 44,
              height: 22,
              borderRadius: "44px 44px 0 0",
              background: "linear-gradient(135deg,#e4c97e,#8a6526)",
            }}
          />
        </div>
      )}
      <div
        className="text-gold-grad font-serif font-bold"
        style={{
          fontSize: big ? 46 : 36,
          lineHeight: 0.9,
          letterSpacing: "0.05em",
        }}
      >
        SŌL
      </div>
      <div
        className="text-[#8a8178] font-medium"
        style={{
          fontSize: big ? 9.5 : 8,
          letterSpacing: "0.55em",
          margin: "6px 0 0 0.55em",
        }}
      >
        BEAUTY LAB
      </div>
    </div>
  );
}
