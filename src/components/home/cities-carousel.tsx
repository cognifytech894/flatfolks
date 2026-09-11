import Image from "next/image";

const cities = [
  { name: "Noida", img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80" },
  { name: "Greater Noida", img: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=800&q=80" },
  { name: "Delhi", img: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80" },
  { name: "Gurugram", img: "https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?auto=format&fit=crop&w=800&q=80" },
  { name: "Bangalore", img: "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=800&q=80" },
  { name: "Pune", img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80" },
  { name: "Hyderabad", img: "https://images.unsplash.com/photo-1520975698516-9a5c4b8bff58?auto=format&fit=crop&w=800&q=80" },
];

export function CitiesCarousel() {
  return (
    <div className="mt-8">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">Popular Cities</h3>
      <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 py-2">
        {cities.map((c) => (
          <div key={c.name} className="min-w-[160px] rounded-2xl bg-white p-2 shadow-sm">
            <div className="overflow-hidden rounded-xl">
              <Image src={c.img} alt={c.name} width={320} height={160} className="object-cover" sizes="(max-width: 640px) 200px, 320px" />
            </div>
            <p className="mt-2 text-center text-sm font-medium text-slate-700">{c.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
