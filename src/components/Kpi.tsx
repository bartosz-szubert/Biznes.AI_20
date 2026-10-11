export function Kpi({ label, value, hero = false }: { label: string; value: string; hero?: boolean }) {
  return (
    <div className={`kpi${hero ? ' hero' : ''}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}
