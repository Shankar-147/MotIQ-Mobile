// Small coloured label for a status, e.g. "succeeded" or "in progress".
export default function Tag({ value }: { value: string }) {
  return <span className={`tag tag-${value}`}>{value.replace(/_/g, ' ')}</span>;
}
