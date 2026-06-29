export default function DashboardLoading() {
  return (
    <div
      style={{
        flex: 1,
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div className="skeleton" style={{ height: 28, width: 220, borderRadius: 8 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 96, borderRadius: 14 }} />
        ))}
      </div>
      <div className="skeleton" style={{ flex: 1, minHeight: 280, borderRadius: 16 }} />
    </div>
  );
}
