export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-2">Session: {id}</h1>
      <p className="text-white/50">Session detail view — coming soon</p>
    </div>
  );
}
