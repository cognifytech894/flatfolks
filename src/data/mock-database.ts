export type MockListing = {
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
  minBudget: number;
  maxBudget: number;
};

export type MockUser = {
  id: string;
  name: string;
  age: number;
  profession: string;
  company: string;
  budget: number;
  gender: string;
  verified: boolean;
};

export const mockUsers: MockUser[] = [
  {
    id: "u1",
    name: "Aarav",
    age: 26,
    profession: "Product Designer",
    company: "Design Studio",
    budget: 18000,
    gender: "Male",
    verified: true,
  },
  {
    id: "u2",
    name: "Riya",
    age: 24,
    profession: "MBA Student",
    company: "Amity University",
    budget: 12000,
    gender: "Female",
    verified: true,
  },
];

export const mockListings: MockListing[] = [
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
    minBudget: 12000,
    maxBudget: 18000,
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
    minBudget: 25000,
    maxBudget: 32000,
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
    minBudget: 9000,
    maxBudget: 15000,
  },
];

export const mockMessages = [
  {
    id: "m1",
    sender: "Owner",
    text: "Hi, the room is still available.",
  },
  {
    id: "m2",
    sender: "You",
    text: "Perfect, I would love to visit this week.",
  },
];
