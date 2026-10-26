export default function KochaLoading() {
  return (
    <div className="bg-background min-h-[80vh] flex items-center justify-center pt-24" role="status" aria-label="Loading">
      <span className="inline-block w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
