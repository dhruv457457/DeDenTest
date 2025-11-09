// app/villas/page.tsx (Simplified Example)
import { db } from '@/lib/database';
import Link from 'next/link';

async function getStays() {
  const stays = await db.stay.findMany({
    where: { isPublished: true },
    orderBy: { startDate: 'asc' },
  });
  return stays;
}

export default async function VillasPage() {
  const stays = await getStays();

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-24">
      <h1 className="text-5xl font-bold text-[#172a46] mb-12">
        Upcoming Stays
      </h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {stays.map((stay) => (
          <Link
            key={stay.id}
            href={`/stay/${stay.stayId}`} // Use stayId for the link
            className="block bg-white p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-shadow"
          >
            <h3 className="text-2xl font-bold text-[#172a46]">{stay.title}</h3>
            <p className="text-gray-600 mt-2">{stay.location}</p>
            <p className="text-gray-800 font-semibold mt-4">
              {new Date(stay.startDate).toLocaleDateString()} - {new Date(stay.endDate).toLocaleDateString()}
            </p>
            <span className="mt-4 inline-block bg-[#172a46] text-white text-sm font-semibold py-2 px-5 rounded-full">
              View Details
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}