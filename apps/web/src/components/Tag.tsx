// Small coloured label for a status, e.g. "succeeded" or "suspended".
export default function Tag({ value }: { value: string }) {
  return <span className={`tag tag-${value}`}>{value}</span>;
}
