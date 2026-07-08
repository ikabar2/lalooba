// Editable footer/legal content lives here in one place — update these
// values directly, no need to hunt through component files.

export const CONTACT_EMAIL = "support@lalooba.com";

// Most commonly prohibited marketplace/shipping items across Canada (CBSA)
// and the US (USPS/customs) — covers what a general community marketplace
// + Jeeb Li baggage-sharing platform realistically needs to flag. Not
// exhaustive and not legal advice — review with a lawyer before treating
// this as your final, binding prohibited-items policy.
export const PROHIBITED_ITEMS: { en: string; ar: string }[] = [
  { en: "Weapons, firearms, ammunition, and replicas", ar: "الأسلحة والذخيرة والنسخ المقلدة منها" },
  { en: "Illegal drugs and drug paraphernalia", ar: "المخدرات غير القانونية وأدواتها" },
  { en: "Explosives, fireworks, and flammable materials", ar: "المتفجرات والألعاب النارية والمواد القابلة للاشتعال" },
  { en: "Counterfeit goods and unauthorized replicas", ar: "البضائع المقلدة والنسخ غير المصرح بها" },
  { en: "Prescription medication and controlled substances", ar: "الأدوية الموصوفة والمواد الخاضعة للرقابة" },
  { en: "Live animals and animal products subject to import restrictions", ar: "الحيوانات الحية ومنتجاتها الخاضعة لقيود الاستيراد" },
  { en: "Currency, money orders, and negotiable instruments", ar: "العملات والحوالات المالية والصكوك القابلة للتداول" },
  { en: "Stolen goods or items without proof of ownership", ar: "البضائع المسروقة أو بدون إثبات ملكية" },
  { en: "Hazardous materials (chemicals, batteries shipped loose, aerosols)", ar: "المواد الخطرة (كيماويات، بطاريات غير معبأة، عبوات رذاذ)" },
  { en: "Tobacco and vaping products across the US/Canada border", ar: "منتجات التبغ والتدخين الإلكتروني عبر حدود أمريكا وكندا" },
  { en: "Alcohol shipped without proper licensing", ar: "الكحول المشحون دون ترخيص مناسب" },
  { en: "Items violating intellectual property or copyright law", ar: "المواد التي تنتهك الملكية الفكرية أو حقوق النشر" },
];
