export const EXPENSE_CATS = [
  { id: "villa",    icon: "🏠", label: "Жильё",    color: "#6C63FF" },
  { id: "car",      icon: "🚗", label: "Машина",   color: "#3498DB" },
  { id: "food",     icon: "🛒", label: "Продукты", color: "#2ECC71" },
  { id: "cafe",     icon: "☕", label: "Кафе",     color: "#F39C12" },
  { id: "belka",    icon: "🐾", label: "Белка",    color: "#E67E22" },
  { id: "sport",    icon: "💪", label: "Спорт",    color: "#1ABC9C" },
  { id: "health",   icon: "💊", label: "Здоровье", color: "#E74C3C" },
  { id: "shopping", icon: "🛍️", label: "Покупки",  color: "#9B59B6" },
  { id: "debt",     icon: "💳", label: "Долг",     color: "#34495E" },
  { id: "other",    icon: "📦", label: "Другое",   color: "#95A5A6" },
];

export const INCOME_CATS = [
  { id: "salary_me", icon: "💼",   label: "Моя ЗП",    color: "#2ECC71" },
  { id: "salary_ox", icon: "👩‍💼", label: "ЗП Оксаны", color: "#27AE60" },
  { id: "rent",      icon: "🏠",   label: "Аренда",    color: "#3498DB" },
  { id: "freelance", icon: "💡",   label: "Вакансии",  color: "#F39C12" },
  { id: "other",     icon: "📦",   label: "Другое",    color: "#95A5A6" },
];

export const ALL_CATS = [...EXPENSE_CATS, ...INCOME_CATS];

// Счета. credit — кредитка: трата по ней не уменьшает остаток, а растит долг.
export const ACCOUNTS = [
  { id: "credit", icon: "💳", label: "Кредитка (₽)", currency: "rub", isDebt: true, debtId: "credit" },
  { id: "rub",    icon: "🇷🇺", label: "Рубли (₽)",   currency: "rub" },
  { id: "bath",   icon: "🇹🇭", label: "Батты (฿)",   currency: "bath" },
  { id: "byn",    icon: "🇧🇾", label: "BYN карта",   currency: "byn" },
  { id: "usd",    icon: "💵", label: "Мир $ карта",  currency: "usd" },
];

export const CURRENCY_SUFFIX = { rub: "₽", bath: "฿", byn: "BYN", usd: "$" };

export const acc = (id) => ACCOUNTS.find((a) => a.id === id);
export const cat = (id) => ALL_CATS.find((c) => c.id === id);
