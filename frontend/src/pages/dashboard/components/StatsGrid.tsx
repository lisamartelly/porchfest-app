interface StatsGridProps {
  pendingBands: number;
  pendingPorches: number;
  approvedBands: number;
  approvedPorches: number;
}

export default function StatsGrid({
  pendingBands,
  pendingPorches,
  approvedBands,
  approvedPorches,
}: StatsGridProps) {
  return (
    <div className="grid md:grid-cols-4 gap-6 mb-8">
      <div className="card p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-2">
          Pending Bands
        </h3>
        <p className="text-3xl font-bold text-yellow-600">{pendingBands}</p>
      </div>
      <div className="card p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-2">
          Pending Porches
        </h3>
        <p className="text-3xl font-bold text-yellow-600">{pendingPorches}</p>
      </div>
      <div className="card p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-2">
          Approved Bands
        </h3>
        <p className="text-3xl font-bold text-green-600">{approvedBands}</p>
      </div>
      <div className="card p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-2">
          Approved Porches
        </h3>
        <p className="text-3xl font-bold text-green-600">{approvedPorches}</p>
      </div>
    </div>
  );
}
