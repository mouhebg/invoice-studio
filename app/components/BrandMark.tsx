export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={compact ? "brand-mark brand-mark-compact" : "brand-mark"}
      aria-hidden="true"
    >
      <span>IV</span>
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
