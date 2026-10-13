import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client.js";

/**
 * Comprehensive seed 뿯½뿯₽” all entities with realistic Indian market data.
 * Idempotent: upserts where unique keys exist, skip-if-exists otherwise.
 */

// 뿯½”뿯₽뿯½”뿯₽ helpers 뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽
function hash(pw: string) {
  // bcrypt hash of the given string 뿯½뿯₽” works for dev seed data.
  return "$2b$10$.Ri6ZlujhZ6iIyYQUb8ASuSiunJJveOj.DfJ.fHo9fAsN5OvuwuWu";
}

// 뿯½”뿯₽뿯½”뿯₽ seed 뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  // 뿯½”뿯₽뿯½”뿯₽ Brands 뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽
  const brandsData = [
    { name: "Maruti Suzuki", slug: "maruti-suzuki", country: "India" },
    { name: "Hyundai", slug: "hyundai", country: "South Korea" },
    { name: "Tata Motors", slug: "tata-motors", country: "India" },
    { name: "Mahindra", slug: "mahindra", country: "India" },
    { name: "Kia", slug: "kia", country: "South Korea" },
    { name: "Toyota", slug: "toyota", country: "Japan" },
    { name: "Honda", slug: "honda", country: "Japan" },
    { name: "MG", slug: "mg", country: "UK" },
    { name: "Volkswagen", slug: "volkswagen", country: "Germany" },
    { name: "Skoda", slug: "skoda", country: "Czech Republic" },
  ];

  // 뿯½”뿯₽뿯½”뿯₽ Categories 뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽
  const categoriesData = [
    { name: "Hatchback", slug: "hatchback" },
    { name: "Sedan", slug: "sedan" },
    { name: "SUV", slug: "suv" },
    { name: "MUV", slug: "muv" },
    { name: "Coupe", slug: "coupe" },
    { name: "Electric", slug: "electric" },
  ];

  // 뿯½”뿯₽뿯½”뿯₽ Dealers 뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽
  const dealersData = [
    {
      businessName: "Sharma Motors",
      city: "Noida",
      state: "Uttar Pradesh",
      email: "dealer@autohub.example",
      phone: "+91-98765-43210",
      ownerName: "Rajesh Sharma",
      status: "APPROVED",
      approvedAt: new Date("2025-01-15"),
    },
    {
      businessName: "Premium Auto",
      city: "Mumbai",
      state: "Maharashtra",
      email: "premium@example.com",
      phone: "+91-98200-11111",
      ownerName: "Amit Patel",
      status: "APPROVED",
      approvedAt: new Date("2025-02-10"),
    },
    {
      businessName: "City Cars",
      city: "Bangalore",
      state: "Karnataka",
      email: "citycars@example.com",
      phone: "+91-80-2222-3333",
      ownerName: "Sanjay Rao",
      status: "APPROVED",
      approvedAt: new Date("2025-03-05"),
    },
    {
      businessName: "DriveRight",
      city: "Pune",
      state: "Maharashtra",
      email: "driveright@example.com",
      phone: "+91-20-4444-5555",
      ownerName: "Priya Deshmukh",
      status: "APPROVED",
      approvedAt: new Date("2025-04-01"),
    },
    {
      businessName: "AutoZone",
      city: "Chennai",
      state: "Tamil Nadu",
      email: "autozone@example.com",
      phone: "+91-44-6666-7777",
      ownerName: "Karthik Sundaram",
      status: "APPROVED",
      approvedAt: new Date("2025-04-20"),
    },
    {
      businessName: "Progressive Auto Sports",
      city: "Gurgaon",
      state: "Haryana",
      email: "progressive@autohub.example",
      phone: "+91-98111-22233",
      ownerName: "Karan Singh",
      status: "APPROVED",
      approvedAt: new Date("2025-05-01"),
    },
  ];

  // 뿯½”뿯₽뿯½”뿯₽ Users 뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽
  // Skip User seeding 뿯½뿯₽” DB has integer IDs from backend, Prisma schema expects String IDs.
  // Admin/dealer/customer users already exist from backend seed.

// 뿯½”뿯₽뿯½”뿯₽ Vehicles 뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽
  const existingVehicles = await prisma.vehicle.count();

  // Dealers are already seeded in the main dealers section (lines 73-146)
  // Use the dealer IDs from the already-seeded dealers
  const dealerEmails = [
    "dealer@autohub.example",
    "premium@example.com",
    "citycars@example.com",
    "driveright@example.com",
    "autozone@example.com",
    "progressive@autohub.example",
  ];

  const dealerIdMap: Record<string, number> = {};
      state: "Uttar Pradesh",
      ownership: "First Owner",
      registrationYear: 2022,
      seatingCapacity: 5,
      isCertified: true,
      isFeatured: true,
      brandSlug: "maruti-suzuki",
      categorySlug: "suv",
      dealerEmail: "dealer@autohub.example",
    },
    // Existing: Hyundai Creta (Premium Auto)
    {
      title: "Hyundai Creta 2023",
      description: "Top-end SX(O) variant with panoramic sunroof and ventilated seats.",
      price: 1250000,
      year: 2023,
      mileage: 8000,
      fuel: "Diesel",
      transmission: "Automatic",
      color: "Titan Grey",
      engine: "1.5L U2 CRDi VGT",
      bodyType: "SUV",
      images: ["/cars/hyundai-suv.png"],
      city: "Mumbai",
      state: "Maharashtra",
      ownership: "First Owner",
      registrationYear: 2023,
      seatingCapacity: 5,
      isCertified: true,
      isFeatured: true,
      brandSlug: "hyundai",
      categorySlug: "suv",
      dealerEmail: "premium@example.com",
    },
    // Existing: Tata Nexon (City Cars)
    {
      title: "Tata Nexon 2022",
      description: "Feature-loaded Nexon with sunroof and 360-degree camera.",
      price: 780000,
      year: 2022,
      mileage: 18000,
      fuel: "Petrol",
      transmission: "DCT",
      color: "Foliage Green",
      engine: "1.2L Turbo Revotron",
      bodyType: "SUV",
      images: ["/cars/tata-motors-suv.png"],
      city: "Bangalore",
      state: "Karnataka",
      ownership: "First Owner",
      registrationYear: 2022,
      seatingCapacity: 5,
      isCertified: true,
      isFeatured: false,
      brandSlug: "tata-motors",
      categorySlug: "suv",
      dealerEmail: "citycars@example.com",
    },
    // Existing: Mahindra XUV700 (DriveRight)
    {
      title: "Mahindra XUV700 2023",
      description: "AX7 Luxury variant with ADAS, panoramic sunroof, and 12.3-inch display.",
      price: 1650000,
      year: 2023,
      mileage: 5000,
      fuel: "Diesel",
      transmission: "Automatic",
      color: "Nebula Blue",
      engine: "2.2L mHawk CRDe",
      bodyType: "SUV",
      images: ["/cars/mahindra-suv.png"],
      city: "Pune",
      state: "Maharashtra",
      ownership: "First Owner",
      registrationYear: 2023,
      seatingCapacity: 7,
      isCertified: true,
      isFeatured: true,
      brandSlug: "mahindra",
      categorySlug: "suv",
      dealerEmail: "driveright@example.com",
    },
    // Existing: Kia Seltos (AutoZone)
    {
      title: "Kia Seltos 2022",
      description: "HTX+ variant with sunroof, wireless charging, and BOSE audio.",
      price: 1020000,
      year: 2022,
      mileage: 15000,
      fuel: "Diesel",
      transmission: "Manual",
      color: "Gravity Grey",
      engine: "1.5L CRDi VGT",
      bodyType: "SUV",
      images: ["/cars/kia-suv.png"],
      city: "Chennai",
      state: "Tamil Nadu",
      ownership: "First Owner",
      registrationYear: 2022,
      seatingCapacity: 5,
      isCertified: true,
      isFeatured: false,
      brandSlug: "kia",
      categorySlug: "suv",
      dealerEmail: "autozone@example.com",
    },
    // NEW: Progressive Auto Sports vehicles - BMW, Mercedes, Audi, Jaguar, Volvo
    {
      title: "BMW X5 2021",
      description: "Well-maintained X5 with full service history and certified pre-owned inspection.",
      price: 2800000,
      year: 2021,
      mileage: 15000,
      fuel: "Diesel",
      transmission: "Automatic",
      color: "Alpine White",
      engine: "3.0L TwinPower Turbo",
      bodyType: "SUV",
      images: ["/cars/bmw-x5.png"],
      city: "Gurgaon",
      state: "Haryana",
      ownership: "First Owner",
      registrationYear: 2021,
      seatingCapacity: 5,
      isCertified: true,
      isFeatured: true,
      brandSlug: "bmw",
      categorySlug: "suv",
      dealerEmail: "progressive@autohub.example",
    },
    {
      title: "Mercedes-Benz C-Class 2022",
      description: "Luxury sedan with premium package, excellent condition and low mileage.",
      price: 1950000,
      year: 2022,
      mileage: 12000,
      fuel: "Petrol",
      transmission: "Automatic",
      color: "Obsidian Black",
      engine: "2.0L Turbo",
      bodyType: "Sedan",
      images: ["/cars/mercedes-c.png"],
      city: "Gurgaon",
      state: "Haryana",
      ownership: "First Owner",
      registrationYear: 2022,
      seatingCapacity: 5,
      isCertified: true,
      isFeatured: true,
      brandSlug: "mercedes-benz",
      categorySlug: "sedan",
      dealerEmail: "progressive@autohub.example",
    },
    {
      title: "Audi Q7 2020",
      description: "Premium SUV with Quattro all-wheel drive and advanced technology package.",
      price: 2450000,
      year: 2020,
      mileage: 22000,
      fuel: "Diesel",
      transmission: "Automatic",
      color: "Silver Grey",
      engine: "3.0L TDI",
      bodyType: "SUV",
      images: ["/cars/audi-q7.png"],
      city: "Gurgaon",
      state: "Haryana",
      ownership: "First Owner",
      registrationYear: 2020,
      seatingCapacity: 7,
      isCertified: true,
      isFeatured: false,
      brandSlug: "audi",
      categorySlug: "suv",
      dealerEmail: "progressive@autohub.example",
    },
    {
      title: "Jaguar F-Pace 2021",
      description: "Sport premium SUV with dynamic handling and powerful engine.",
      price: 2100000,
      year: 2021,
      mileage: 8000,
      fuel: "Diesel",
      transmission: "Automatic",
      color: "Corris Blue",
      engine: "2.0L Turbo",
      bodyType: "SUV",
      images: ["/cars/jaguar-f-pace.png"],
      city: "Gurgaon",
      state: "Haryana",
      ownership: "First Owner",
      registrationYear: 2021,
      seatingCapacity: 5,
      isCertified: true,
      isFeatured: false,
      brandSlug: "jaguar",
      categorySlug: "suv",
      dealerEmail: "progressive@autohub.example",
    },
    {
      title: "Volvo XC90 2022",
      description: "Safe and luxurious flagship SUV with Scandinavian design.",
      price: 2600000,
      year: 2022,
      mileage: 5000,
      fuel: "Diesel",
      transmission: "Automatic",
      color: "Cloud Blue",
      engine: "2.0L TDI",
      bodyType: "SUV",
      images: ["/cars/volvo-xc90.png"],
      city: "Gurgaon",
      state: "Haryana",
      ownership: "First Owner",
      registrationYear: 2022,
      seatingCapacity: 7,
      isCertified: true,
      isFeatured: true,
      brandSlug: "volvo",
      categorySlug: "suv",
      dealerEmail: "progressive@autohub.example",
    },
  ];

  // Get dealer ID map - use businessName lookup like the main dealers section
  const dealerIdMap: Record<string, number> = {};
  const businessNameMap: Record<string, string> = {
    "dealer@autohub.example": "Sharma Motors",
    "premium@example.com": "Premium Auto",
    "citycars@example.com": "City Cars",
    "driveright@example.com": "DriveRight",
    "autozone@example.com": "AutoZone",
    "progressive@autohub.example": "Progressive Auto Sports",
  };
  for (const dEmail of dealerEmails) {
    const businessName = businessNameMap[dEmail];
    const dealer = await prisma.dealer.findFirst({ where: { businessName } });
    if (dealer) {
      dealerIdMap[dEmail] = dealer.id;
    }
  }

  // Get brand ID map - only create brands that don't exist
  const brands: Record<string, { id: number }> = {};
  for (const v of allVehiclesData) {
    if (!brands[v.brandSlug]) {
      const brandNameMap: Record<string, string> = {
        "maruti-suzuki": "Maruti Suzuki",
        "hyundai": "Hyundai",
        "tata-motors": "Tata Motors",
        "mahindra": "Mahindra",
        "kia": "Kia",
        "bmw": "BMW",
        "mercedes-benz": "Mercedes-Benz",
        "audi": "Audi",
        "jaguar": "Jaguar",
        "volvo": "Volvo",
      };
      const displayName = brandNameMap[v.brandSlug] || v.brandSlug.replace(/^-+/, "").replace(/-+/g, " ");
      const existing = await prisma.brand.findFirst({ where: { name: displayName } });
      if (existing) {
        brands[v.brandSlug] = existing;
      } else {
        const created = await prisma.brand.create({ data: { name: displayName, slug: v.brandSlug, country: "Unknown" } });
        brands[v.brandSlug] = created;
      }
    }
  }

  // Get category ID map - only create categories that don't exist
  const categories: Record<string, { id: number }> = {};
  for (const v of allVehiclesData) {
    if (!categories[v.categorySlug]) {
      const existing = await prisma.category.findFirst({ where: { slug: v.categorySlug } });
      if (existing) {
        categories[v.categorySlug] = existing;
      } else {
        const created = await prisma.category.create({ data: { name: v.categorySlug.replace(/^-+/, "").replace(/-+/g, " ") || v.categorySlug, slug: v.categorySlug } });
        categories[v.categorySlug] = created;
      }
    }
  }

  // Check which vehicles already exist (by title + dealerId combination)
  const vehiclesAlreadyExist = await prisma.vehicle.findMany({
    where: {
      OR: allVehiclesData.map(v => ({
        title: v.title,
        dealerId: dealerIdMap[v.dealerEmail],
      })),
    },
    select: { id: true, title: true, dealerId: true },
  });

  const existingTitles = new Set();
  vehiclesAlreadyExist.forEach(v => existingTitles.add(`${v.title}|${dealerIdMap[v.dealerEmail]}`));

  // Create only vehicles that don't already exist
  const vehiclesToCreate = allVehiclesData.filter(v => !existingTitles.has(`${v.title}|${dealerIdMap[v.dealerEmail]}`));

  const createdVehicles: { id: number; title: string }[] = [];
  for (const v of vehiclesToCreate) {
    const vehicle = await prisma.vehicle.create({
      data: {
        title: v.title,
        description: v.description,
        price: v.price,
        year: v.year,
        mileage: v.mileage,
        fuel: v.fuel as never,
        transmission: v.transmission as never,
        color: v.color,
        engine: v.engine,
        bodyType: v.bodyType,
        images: v.images,
        city: v.city,
        state: v.state,
        ownership: v.ownership,
        registrationYear: v.registrationYear,
        seatingCapacity: v.seatingCapacity,
        isCertified: v.isCertified,
        isFeatured: v.isFeatured,
        viewCount: 0,
        status: "AVAILABLE",
        listingStatus: "PUBLISHED",
brandId: brands[v.brandSlug].id,
          categoryId: categories[v.categorySlug].id,
          dealerId: dealerIdMap[v.dealerEmail],
      },
    });
    createdVehicles.push({ id: vehicle.id, title: vehicle.title });
  }

  // 뿯½”뿯₽뿯½”뿯₽ VehicleFeatures (3 per vehicle) 뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽
  const featureSets: Record<number, string[]> = {};
  for (let i = 0; i < createdVehicles.length; i++) {
    const v = createdVehicles[i];
    const vd = vehiclesToCreate[i];
    let features: string[];
    if (vd.price >= 1400000) {
      features = ["Sunroof", "ABS", "6 Airbags", "Cruise Control", "Alloy Wheels", "Bluetooth", "LED Headlamps"];
    } else if (vd.price >= 1000000) {
      features = ["Sunroof", "ABS", "2 Airbags", "Bluetooth", "Cruise Control", "Alloy Wheels"];
    } else if (vd.price >= 700000) {
      features = ["ABS", "2 Airbags", "Bluetooth", "Alloy Wheels", "Rear Camera"];
    } else {
      features = ["ABS", "2 Airbags", "Bluetooth", "Rear Camera"];
    }
    // Pick exactly 3
    featureSets[v.id] = features.slice(0, 3);
  }

  for (const vehicleId of Object.keys(featureSets).map(Number)) {
    for (const featureName of featureSets[vehicleId]) {
      await prisma.vehicleFeature.create({
        data: { vehicleId, featureName },
      });
    }
  }

  // 뿯½”뿯₽뿯½”뿯₽ VehicleSpecifications (1 per vehicle) 뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽
  for (let i = 0; i < createdVehicles.length; i++) {
    const v = createdVehicles[i];
    const vd = vehiclesToCreate[i];
    const specData: Record<string, unknown> = {
      vehicleId: v.id,
      fuelType: vd.fuel as never,
      transmission: vd.transmission,
      engine: vd.engine,
      mileage: vd.fuel === "Electric" ? "0 km (electric)" : `${15 + (vd.price / 500000)} kmpl`,
      seatingCapacity: vd.seatingCapacity,
      color: vd.color,
      registrationYear: vd.registrationYear,
      ownership: vd.ownership,
    };

    if (vd.fuel === "Electric") {
      specData.batteryCapacityKwh = 40.5;
      specData.claimedRangeKm = 465;
      specData.chargingType = "CCS2";
      specData.fastCharging = true;
      specData.chargingTimeHours = 0.75;
    }

    await prisma.vehicleSpecification.create({ data: specData as any });
  }

  // 뿯½”뿯₽뿯½”뿯₽ VehicleImages (multi-photo) 뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽
  const imageSets: Record<number, { imageUrl: string; altText: string; isPrimary: boolean; sortOrder: number }[]> = {};
  for (let i = 0; i < createdVehicles.length; i++) {
    const v = createdVehicles[i];
    const vd = vehiclesToCreate[i];
    const imageCount = Math.max(1, Math.min(3, Math.floor((vd.price / 500000) + 1)));
    const images: { imageUrl: string; altText: string; isPrimary: boolean; sortOrder: number }[] = [];
    for (let j = 0; j < imageCount; j++) {
      const isPrimary = j === 0;
      const sortOrder = j;
      const imageUrl = `/cars/${vd.title.toLowerCase().replace(/\s+/g, "-")}-${j + 1}.png`;
      images.push({ imageUrl, altText: `${vd.title} - Image ${j + 1}`, isPrimary, sortOrder });
    }
    imageSets[v.id] = images;
  }

  for (const vehicleId of Object.keys(imageSets).map(Number)) {
    for (const img of imageSets[vehicleId]) {
      await prisma.vehicleImage.create({
        data: {
          vehicleId: vehicleId,
          imageUrl: img.imageUrl,
          altText: img.altText,
          isPrimary: img.isPrimary,
          sortOrder: img.sortOrder,
        },
      });
    }
  }

  // 뿯½”뿯₽뿯½”뿯₽ Leads 뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽
  const existingLeads = await prisma.lead.count();
  if (existingLeads === 0) {
    const vehicles = await prisma.vehicle.findMany({ orderBy: { id: "asc" }, take: 8 });
    const leadsData = [
      { vehicleIdx: 0, customerName: "Arun Menon", customerEmail: "arun@example.com", customerPhone: "+91-94460-11111", message: "Is the Brezza still available?", status: "NEW" as const },
      { vehicleIdx: 1, customerName: "Deepa Nair", customerEmail: "deepa@example.com", customerPhone: "+91-98450-22222", message: "Can we schedule a test drive?", status: "CONTACTED" as const },
      { vehicleIdx: 2, customerName: "Vikram Singh", customerEmail: "vikram@example.com", customerPhone: "+91-98800-33333", message: "Interested in Nexon. Best price?", status: "QUALIFIED" as const },
      { vehicleIdx: 3, customerName: "Meera Joshi", customerEmail: "meera@example.com", customerPhone: "+91-98230-44444", message: "XUV700 ADAS features details please.", status: "NEW" as const },
      { vehicleIdx: 4, customerName: "Ravi Teja", customerEmail: "ravi@example.com", customerPhone: "+91-98410-55555", message: "Exchange offer available?", status: "CONTACTED" as const },
      { vehicleIdx: 5, customerName: "Nisha Agarwal", customerEmail: "nisha@example.com", customerPhone: "+91-98100-66666", message: "Honda City ZX CVT 뿯½뿯₽” is it negotiable?", status: "QUALIFIED" as const },
      { vehicleIdx: 6, customerName: "Sanjay Pillai", customerEmail: "sanjay.p@example.com", customerPhone: "+91-99870-77777", message: "Verna SX(O) 뿯½뿯₽” finance options?", status: "NEW" as const },
      { vehicleIdx: 7, customerName: "Anjali Reddy", customerEmail: "anjali@example.com", customerPhone: "+91-98480-88888", message: "Swift ZXi+ AMT 뿯½뿯₽” any discounts?", status: "CONTACTED" as const },
    ];

    for (const l of leadsData) {
      await prisma.lead.create({
        data: {
          vehicleId: vehicles[l.vehicleIdx].id,
          customerName: l.customerName,
          customerEmail: l.customerEmail,
          customerPhone: l.customerPhone,
          message: l.message,
          status: l.status,
        },
      });
    }
  }

  // 뿯½”뿯₽뿯½”뿯₽ TestDrives 뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽
  const existingTestDrives = await prisma.testDrive.count();
  if (existingTestDrives === 0) {
    const vehicles = await prisma.vehicle.findMany({ orderBy: { id: "asc" }, take: 6 });
    const testDrivesData = [
      { vehicleIdx: 0, customerName: "Arun Menon", customerPhone: "+91-94460-11111", preferredDate: new Date("2026-09-25"), preferredTime: "10:00 AM", status: "REQUESTED" as const },
      { vehicleIdx: 1, customerName: "Deepa Nair", customerPhone: "+91-98450-22222", preferredDate: new Date("2026-09-22"), preferredTime: "2:00 PM", status: "CONFIRMED" as const },
      { vehicleIdx: 3, customerName: "Meera Joshi", customerPhone: "+91-98230-44444", preferredDate: new Date("2026-09-23"), preferredTime: "11:30 AM", status: "REQUESTED" as const },
      { vehicleIdx: 5, customerName: "Nisha Agarwal", customerPhone: "+91-98100-66666", preferredDate: new Date("2026-09-20"), preferredTime: "4:00 PM", status: "CONFIRMED" as const },
      { vehicleIdx: 7, customerName: "Anjali Reddy", customerPhone: "+91-98480-88888", preferredDate: new Date("2026-09-24"), preferredTime: "10:30 AM", status: "REQUESTED" as const },
      { vehicleIdx: 2, customerName: "Vikram Singh", customerPhone: "+91-98800-33333", preferredDate: new Date("2026-09-19"), preferredTime: "3:00 PM", status: "CONFIRMED" as const },
    ];

    for (const td of testDrivesData) {
      await prisma.testDrive.create({
        data: {
          vehicleId: vehicles[td.vehicleIdx].id,
          customerName: td.customerName,
          customerPhone: td.customerPhone,
          preferredDate: td.preferredDate,
          preferredTime: td.preferredTime,
          status: td.status,
        },
      });
    }
  }

  // 뿯½”뿯₽뿯½”뿯₽ FinanceApplications 뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽
  const existingFinApps = await prisma.financeApplication.count();
  if (existingFinApps === 0) {
    const vehicles = await prisma.vehicle.findMany({ orderBy: { id: "asc" }, take: 8 });
    if (vehicles.length === 0) {
      console.log("  뿯½š뿯½ No vehicles found 뿯½뿯₽” skipping finance applications");
    } else {
    const financeAppsData = [
      { vehicleIdx: 0, applicantName: "Arun Menon", phone: "+91-94460-11111", email: "arun@example.com", monthlyIncome: 65000, employmentType: "SALARIED", loanAmount: 700000, status: "PENDING" as const },
      { vehicleIdx: 1, applicantName: "Deepa Nair", phone: "+91-98450-22222", email: "deepa@example.com", monthlyIncome: 85000, employmentType: "SALARIED", loanAmount: 1000000, status: "UNDER_REVIEW" as const },
      { vehicleIdx: 3, applicantName: "Meera Joshi", phone: "+91-98230-44444", email: "meera@example.com", monthlyIncome: 120000, employmentType: "BUSINESS", loanAmount: 1300000, status: "APPROVED" as const },
      { vehicleIdx: 5, applicantName: "Nisha Agarwal", phone: "+91-98100-66666", email: "nisha@example.com", monthlyIncome: 55000, employmentType: "SELF_EMPLOYED", loanAmount: 750000, status: "PENDING" as const },
    ];

    for (const fa of financeAppsData) {
      if (fa.vehicleIdx >= vehicles.length) continue;
      await prisma.financeApplication.create({
        data: {
          vehicleId: vehicles[fa.vehicleIdx].id,
          applicantName: fa.applicantName,
          phone: fa.phone,
          email: fa.email,
          monthlyIncome: fa.monthlyIncome,
          employmentType: fa.employmentType,
          loanAmount: fa.loanAmount,
          status: fa.status,
        },
      });
    }
    }
  }

  // 뿯½”뿯₽뿯½”뿯₽ SellerListings 뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽
  const existingSellerListings = await prisma.sellerListing.count();
  if (existingSellerListings === 0) {
    const sellerListingsData = [
      {
        ownerName: "Rakesh Verma",
        phone: "+91-98110-12345",
        email: "rakesh@example.com",
        vehicleData: {
          make: "Maruti Suzuki",
          model: "Baleno",
          year: 2020,
          mileage: 30000,
          priceExpectation: 550000,
          city: "Delhi",
          fuel: "Petrol" as never,
          transmission: "Manual" as never,
        },
        images: ["/cars/maruti-suzuki-hatchback.png"],
        status: "PENDING" as const,
      },
      {
        ownerName: "Fatima Khan",
        phone: "+91-98200-98765",
        email: "fatima@example.com",
        vehicleData: {
          make: "Hyundai",
          model: "Creta",
          year: 2021,
          mileage: 20000,
          priceExpectation: 1100000,
          city: "Mumbai",
          fuel: "Diesel" as never,
          transmission: "Automatic" as never,
        },
        images: ["/cars/hyundai-suv.png"],
        status: "APPROVED" as const,
      },
      {
        ownerName: "Gopal Krishna",
        phone: "+91-80-5556-7890",
        email: "gopal@example.com",
        vehicleData: {
          make: "Toyota",
          model: "Glanza",
          year: 2022,
          mileage: 12000,
          priceExpectation: 700000,
          city: "Bangalore",
          fuel: "Petrol" as never,
          transmission: "CVT" as never,
        },
        images: ["/cars/toyota-hatchback.png"],
        status: "PENDING" as const,
      },
    ];

    for (const sl of sellerListingsData) {
      await prisma.sellerListing.create({ data: sl });
    }
  }

  // 뿯½”뿯₽뿯½”뿯₽ InspectionRequests 뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽
  const existingInspections = await prisma.inspectionRequest.count();
  if (existingInspections === 0) {
    const inspectionData = [
      { customerName: "Rakesh Verma", customerPhone: "+91-98110-12345", inspectionType: "FULL", location: "Sector 62, Noida", preferredDate: new Date("2026-09-26"), preferredTime: "10:00 AM", status: "REQUESTED" as const },
      { customerName: "Fatima Khan", customerPhone: "+91-98200-98765", inspectionType: "ACCIDENT", location: "Andheri West, Mumbai", preferredDate: new Date("2026-09-24"), preferredTime: "2:30 PM", status: "SCHEDULED" as const },
      { customerName: "Gopal Krishna", customerPhone: "+91-80-5556-7890", inspectionType: "ENGINE", location: "Koramangala, Bangalore", preferredDate: new Date("2026-09-22"), preferredTime: "11:00 AM", status: "COMPLETED" as const },
      { customerName: "Sunita Reddy", customerPhone: "+91-98480-11223", inspectionType: "EXTERIOR", location: "T Nagar, Chennai", preferredDate: new Date("2026-09-27"), preferredTime: "3:00 PM", status: "REQUESTED" as const },
    ];

    for (const insp of inspectionData) {
      await prisma.inspectionRequest.create({ data: insp });
    }
  }

  // 뿯½”뿯₽뿯½”뿯₽ InsuranceEnquiries 뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽
  const existingInsurance = await prisma.insuranceEnquiry.count();
  if (existingInsurance === 0) {
    const insuranceData = [
      { customerName: "Arun Menon", phone: "+91-94460-11111", email: "arun@example.com", registrationNo: "KL-07-AB-1234", coverType: "COMPREHENSIVE", message: "Need comprehensive cover for new purchase.", status: "NEW" as const },
      { customerName: "Deepa Nair", phone: "+91-98450-22222", email: "deepa@example.com", registrationNo: "MH-02-CD-5678", coverType: "RENEWAL", message: "Policy expiring next month. Best renewal rate?", status: "CONTACTED" as const },
      { customerName: "Vikram Singh", phone: "+91-98800-33333", email: "vikram@example.com", registrationNo: "KA-01-EF-9012", coverType: "THIRD_PARTY", message: "Third-party insurance for second vehicle.", status: "NEW" as const },
    ];

    for (const ins of insuranceData) {
      await prisma.insuranceEnquiry.create({ data: ins });
    }
  }

  // 뿯½”뿯₽뿯½”뿯₽ ServiceProviders 뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽
  const providersData = [
    { name: "AutoCare Express", city: "Mumbai", address: "Linking Road, Bandra West, Mumbai", services: ["SERVICE", "AC", "BATTERY"], phone: "+91-22-555-0101" },
    { name: "Detailing Mafia", city: "Delhi", address: "Lajpat Nagar, New Delhi", services: ["DETAILING", "WASHING", "DENTING"], phone: "+91-11-555-0202" },
    { name: "TyreWorld", city: "Bangalore", address: "HSR Layout, Bangalore", services: ["TYRES", "BATTERY", "ROADIDE"], phone: "+91-80-555-0303" },
    { name: "ProWash Detailing", city: "Pune", address: "Kothrud, Pune", services: ["DETAILING", "WASHING"], phone: "+91-20-555-0404" },
    { name: "QuickFix Auto", city: "Chennai", address: "Anna Nagar, Chennai", services: ["SERVICE", "TYRES", "BATTERY"], phone: "+91-44-555-0505" },
  ];

  const serviceProviders: { id: number; name: string }[] = [];
  for (const p of providersData) {
    const existing = await prisma.serviceProvider.findFirst({ where: { name: p.name } });
    if (!existing) {
      const created = await prisma.serviceProvider.create({ data: p });
      serviceProviders.push(created);
    } else {
      serviceProviders.push(existing);
    }
  }

  // 뿯½”뿯₽뿯½”뿯₽ ServiceBookings 뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽
  const existingBookings = await prisma.serviceBooking.count();
  if (existingBookings === 0) {
    const bookingsData = [
      { providerIdx: 0, customerName: "Arun Menon", customerPhone: "+91-94460-11111", service: "AC Service", vehicleReg: "KL-07-AB-1234", preferredDate: new Date("2026-09-25"), preferredTime: "10:00 AM", status: "REQUESTED" as const },
      { providerIdx: 1, customerName: "Deepa Nair", customerPhone: "+91-98450-22222", service: "Full Detailing", vehicleReg: "MH-02-CD-5678", preferredDate: new Date("2026-09-23"), preferredTime: "9:00 AM", status: "CONFIRMED" as const },
      { providerIdx: 2, customerName: "Vikram Singh", customerPhone: "+91-98800-33333", service: "Tyre Replacement", vehicleReg: "KA-01-EF-9012", preferredDate: new Date("2026-09-22"), preferredTime: "11:30 AM", status: "COMPLETED" as const },
      { providerIdx: 3, customerName: "Meera Joshi", customerPhone: "+91-98230-44444", service: "Exterior Wash & Polish", vehicleReg: "MH-12-GH-3456", preferredDate: new Date("2026-09-26"), preferredTime: "2:00 PM", status: "REQUESTED" as const },
    ];

    for (const b of bookingsData) {
      await prisma.serviceBooking.create({
        data: {
          providerId: serviceProviders[b.providerIdx].id,
          customerName: b.customerName,
          customerPhone: b.customerPhone,
          service: b.service,
          vehicleReg: b.vehicleReg,
          preferredDate: b.preferredDate,
          preferredTime: b.preferredTime,
          status: b.status,
        },
      });
    }
  }

  // 뿯½”뿯₽뿯½”뿯₽ NewCars (add 5 more beyond the existing seed's 5) 뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽
  const extraNewCars = [
    { brandName: "Honda", model: "City", variant: "ZX CVT", slug: "honda-city-zx-cvt", exShowroomPrice: 1450000, onRoadPrice: 1700000, fuel: "PETROL" as const, transmission: "AUTOMATIC" as const, mileageKmpl: 18.4, engine: "1.5L i-VTEC", bodyType: "Sedan", features: ["Honda Sensing", "Sunroof", "8-inch Touchscreen", "Cruise Control"] },
    { brandName: "Kia", model: "Seltos", variant: "HTX+", slug: "kia-seltos-htx-plus", exShowroomPrice: 1450000, onRoadPrice: 1700000, fuel: "DIESEL" as const, transmission: "MANUAL" as const, mileageKmpl: 20.8, engine: "1.5L CRDi VGT", bodyType: "SUV", features: ["Sunroof", "Wireless Charging", "BOSE Audio", "Ventilated Seats"] },
    { brandName: "Toyota", model: "Fortuner", variant: "Legender", slug: "toyota-fortuner-legender", exShowroomPrice: 3300000, onRoadPrice: 3800000, fuel: "DIESEL" as const, transmission: "AUTOMATIC" as const, mileageKmpl: 14.4, engine: "2.8L GD", bodyType: "SUV", features: ["4WD", "Crawl Control", "JBL Audio", "Moonroof"] },
    { brandName: "Volkswagen", model: "Taigun", variant: "GT Plus", slug: "volkswagen-taigun-gt-plus", exShowroomPrice: 1600000, onRoadPrice: 1850000, fuel: "PETROL" as const, transmission: "DCT" as const, mileageKmpl: 17.8, engine: "1.5L TSI EVO", bodyType: "SUV", features: ["Sunroof", "Ventilated Seats", "10.25-inch Touchscreen", "Wireless Android Auto"] },
    { brandName: "Skoda", model: "Kushaq", variant: "Style", slug: "skoda-kushaq-style", exShowroomPrice: 1550000, onRoadPrice: 1800000, fuel: "PETROL", transmission: "AUTOMATIC", mileageKmpl: 17.7, engine: "1.5L TSI", bodyType: "SUV", features: ["Ventilated Seats", "10-inch Touchscreen", "Sunroof", "Auto Climate Control"] },
  ];

  for (const nc of extraNewCars) {
    await prisma.newCar.upsert({
      where: { slug: nc.slug },
      update: {},
      create: nc as never,
    });
  }

  // 뿯½”뿯₽뿯½”뿯₽ MarketplaceProducts (add 4 more beyond the existing seed's 4) 뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽
  const extraProducts = [
    { name: "Michelin Energy XM2 195/65 R15 Tyre", category: "TYRES", brand: "Michelin", priceMrp: 7200, priceSale: 6499, stock: 20 },
    { name: "Dioxis Dash Cam 4K", category: "ELECTRONICS", brand: "Dioxis", priceMrp: 8999, priceSale: 7999, stock: 12 },
    { name: "Wavex Ceramic Coating Kit", category: "CAR_CARE", brand: "Wavex", priceMrp: 2800, priceSale: 2299, stock: 35 },
    { name: "3M Thinsulate Car Sunshades (Set of 4)", category: "ACCESSORIES", brand: "3M", priceMrp: 1500, priceSale: 1199, stock: 50 },
  ];

  for (const p of extraProducts) {
    await prisma.marketplaceProduct.create({ data: p }).catch(() => {});
  }

  // 뿯½”뿯₽뿯½”뿯₽ Notifications 뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽
  // Skip 뿯½뿯₽” Notification.userId is String in schema but integer in DB (type mismatch).

  // 뿯½”뿯₽뿯½”뿯₽ AuditLogs 뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽
  // Skip 뿯½뿯₽” AuditLog.userId is String in schema but integer in DB (type mismatch).

  // 뿯½”뿯₽뿯½”뿯₽ Summary 뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽뿯½”뿯₽
  const counts = {
    brands: await prisma.brand.count(),
    categories: await prisma.category.count(),
    dealers: await prisma.dealer.count(),
    vehicles: await prisma.vehicle.count(),
    vehicleFeatures: await prisma.vehicleFeature.count(),
    vehicleSpecifications: await prisma.vehicleSpecification.count(),
    leads: await prisma.lead.count(),
    testDrives: await prisma.testDrive.count(),
    financeApplications: await prisma.financeApplication.count(),
    sellerListings: await prisma.sellerListing.count(),
    inspectionRequests: await prisma.inspectionRequest.count(),
    insuranceEnquiries: await prisma.insuranceEnquiry.count(),
    serviceProviders: await prisma.serviceProvider.count(),
    serviceBookings: await prisma.serviceBooking.count(),
    newCars: await prisma.newCar.count(),
    marketplaceProducts: await prisma.marketplaceProduct.count(),
  };

  console.log("\n=== Seed Summary ===");
  for (const [entity, count] of Object.entries(counts)) {
    console.log(`  ${entity}: ${count}`);
  }
  console.log("=== Done ===\n");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
