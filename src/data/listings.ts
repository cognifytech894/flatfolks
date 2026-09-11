export type Listing = {
  id: string;
  title: string;
  location: string;
  rent: number;
  deposit: number;
  bedrooms: number;
  bathrooms: number;
  propertyType: "Room" | "Apartment" | "Flat" | "PG";
  image: string;
  verified: boolean;
  tags: string[];
  matchScore: number;
};

export const listings: Listing[] = [
  {
    id: "1",
    title: "Bright Studio Near Sector 62",
    location: "Noida, Uttar Pradesh",
    rent: 14000,
    deposit: 35000,
    bedrooms: 1,
    bathrooms: 1,
    propertyType: "Room",
    image:
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
    verified: true,
    tags: ["WiFi", "AC", "Parking"],
    matchScore: 96,
  },
  {
    id: "2",
    title: "Modern 2BHK for Working Professionals",
    location: "Gurugram, Haryana",
    rent: 28000,
    deposit: 70000,
    bedrooms: 2,
    bathrooms: 2,
    propertyType: "Apartment",
    image:
      "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
    verified: true,
    tags: ["Lift", "Power Backup", "Balcony"],
    matchScore: 92,
  },
  {
    id: "3",
    title: "Shared Premium PG with Meals",
    location: "Bangalore, Karnataka",
    rent: 12000,
    deposit: 25000,
    bedrooms: 1,
    bathrooms: 1,
    propertyType: "PG",
    image:
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
    verified: true,
    tags: ["Meals", "Laundry", "WiFi"],
    matchScore: 90,
  },
];
