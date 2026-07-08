// ============================================================================
// SAMPLE / DEMO DATA — replace, don't merge with, real data.
//
// Same rule as listings-data.ts: don't hand-delete fake sellers below once
// real ones exist. Swap the imports (SellerProfileBody, app/seller/[id]/page.tsx)
// for real Supabase queries, then delete this file entirely — note reviews
// also need the `reviews` table to actually exist first (it doesn't yet,
// see the "reviews has no table" gap from the pre-database review).
// ============================================================================

// Sample seller + review data shaped like a future Supabase query result.
// Real version:
//   const { data: seller } = await supabase.from("profiles").select("*").eq("id", id).single();
//   const { data: reviews } = await supabase.from("reviews").select("*").eq("seller_id", id);
// bio/city stay bilingual objects for the same reason listing titles do —
// so the seller profile page translates fully, not just its chrome.

export type Seller = {
  id: string;
  name: string;
  avatarInitials: string;
  verified: boolean;
  city: { en: string; ar: string };
  country: "CA" | "US";
  activeSince: string; // "Month YYYY", pre-formatted for simplicity in sample data
  rating: number; // 0–5, one decimal
  reviewCount: number;
  bio: { en: string; ar: string };
};

export type Review = {
  id: string;
  sellerId: string;
  reviewerName: string;
  rating: number; // 1–5
  comment: { en: string; ar: string };
  date: string; // "Month YYYY"
};

export const sampleSellers: Seller[] = [
  {
    id: "s1",
    name: "Karim M.",
    avatarInitials: "KM",
    verified: true,
    city: { en: "Scarborough", ar: "سكاربورو" },
    country: "CA",
    activeSince: "March 2024",
    rating: 4.9,
    reviewCount: 3,
    bio: {
      en: "Selling gently used thobes and men's wear. Usually replies within a few hours.",
      ar: "أبيع ثيابًا وملابس رجالية مستعملة بحالة جيدة. أرد عادة خلال ساعات قليلة.",
    },
  },
  {
    id: "s2",
    name: "Fatima A.",
    avatarInitials: "FA",
    verified: true,
    city: { en: "Mississauga", ar: "ميسيساغا" },
    country: "CA",
    activeSince: "January 2024",
    rating: 5.0,
    reviewCount: 5,
    bio: {
      en: "Handmade jelabiyas and occasion wear, made to order or ready-to-ship.",
      ar: "جلابيات مصنوعة يدويًا وملابس مناسبات، حسب الطلب أو جاهزة للشحن.",
    },
  },
  {
    id: "s3",
    name: "Hana A.",
    avatarInitials: "HA",
    verified: true,
    city: { en: "Brampton", ar: "برامبتون" },
    country: "CA",
    activeSince: "August 2024",
    rating: 4.7,
    reviewCount: 2,
    bio: {
      en: "Home-cooked Sudanese staples made fresh to order — ful, kisra, and more.",
      ar: "أطباق سودانية منزلية طازجة حسب الطلب — فول، كسرة، وغيرها.",
    },
  },
  {
    id: "s4",
    name: "Youssef S.",
    avatarInitials: "YS",
    verified: false,
    city: { en: "North York", ar: "نورث يورك" },
    country: "CA",
    activeSince: "June 2025",
    rating: 4.2,
    reviewCount: 1,
    bio: {
      en: "New to Lalooba — occasional home-cooked meals for pickup.",
      ar: "عضو جديد في لالوبا — وجبات منزلية بين الحين والآخر للاستلام.",
    },
  },
  {
    id: "s5",
    name: "Mona O.",
    avatarInitials: "MO",
    verified: true,
    city: { en: "Seattle", ar: "سياتل" },
    country: "US",
    activeSince: "November 2023",
    rating: 4.8,
    reviewCount: 4,
    bio: {
      en: "Hand-carved wood crafts and home decor from Sudan.",
      ar: "منتجات خشبية محفورة يدويًا وديكورات منزلية من السودان.",
    },
  },
  {
    id: "s6",
    name: "Nadia S.",
    avatarInitials: "NS",
    verified: false,
    city: { en: "Spokane", ar: "سبوكان" },
    country: "US",
    activeSince: "April 2025",
    rating: 4.5,
    reviewCount: 1,
    bio: {
      en: "Embroidered scarves and small accessories, made in small batches.",
      ar: "طرح مطرزة وإكسسوارات صغيرة، تُصنع بكميات محدودة.",
    },
  },
];

export const sampleReviews: Review[] = [
  {
    id: "r1",
    sellerId: "s1",
    reviewerName: "Ahmed O.",
    rating: 5,
    comment: {
      en: "Great quality thobe, exactly as pictured. Fast reply and easy pickup.",
      ar: "ثوب بجودة ممتازة، تمامًا كما في الصورة. رد سريع واستلام سهل.",
    },
    date: "May 2025",
  },
  {
    id: "r2",
    sellerId: "s1",
    reviewerName: "Salma K.",
    rating: 5,
    comment: { en: "Very trustworthy seller, would buy again.", ar: "بائع موثوق جدًا، سأشتري منه مرة أخرى." },
    date: "March 2025",
  },
  {
    id: "r3",
    sellerId: "s1",
    reviewerName: "Ibrahim T.",
    rating: 4,
    comment: { en: "Good item, pickup took a bit of coordinating.", ar: "المنتج جيد، احتجنا بعض التنسيق للاستلام." },
    date: "December 2024",
  },
  {
    id: "r4",
    sellerId: "s2",
    reviewerName: "Huda M.",
    rating: 5,
    comment: { en: "Beautiful embroidery, made exactly to my measurements.", ar: "تطريز جميل جدًا، وصُنعت تمامًا حسب مقاسي." },
    date: "June 2025",
  },
  {
    id: "r5",
    sellerId: "s2",
    reviewerName: "Rania B.",
    rating: 5,
    comment: { en: "Second time ordering from her — always excellent.", ar: "ثاني مرة أطلب منها — دائمًا ممتازة." },
    date: "April 2025",
  },
  {
    id: "r6",
    sellerId: "s3",
    reviewerName: "Omar K.",
    rating: 5,
    comment: { en: "Tastes just like home. Will order again.", ar: "طعمها تمامًا مثل البيت. سأطلب مرة أخرى." },
    date: "September 2024",
  },
  {
    id: "r7",
    sellerId: "s5",
    reviewerName: "Layla H.",
    rating: 5,
    comment: { en: "Stunning craftsmanship, shipped carefully.", ar: "حرفية رائعة، وتم الشحن بعناية." },
    date: "February 2025",
  },
];
