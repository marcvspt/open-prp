interface Props {
  label?: string;
  className?: string;
}

export default function LoadingSpinner({ label, className }: Props) {
  return (
    <div role={label ? "status" : undefined} className={className}>
      <span aria-hidden="true" className="inline-block size-5 rounded-full border-2 border-primary/25 border-t-primary align-middle motion-safe:animate-spin" />
      {label && <span className="sr-only">{label}</span>}
    </div>
  );
}
