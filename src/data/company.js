/**
 * هوية المتجر النظامية — المصدر الوحيد لكل ما يُطبع في «عرض السعر».
 *
 * القاعدة هنا صريحة لأن الجهة تشتري بورقة: لا نختلق رقمًا ضريبيًّا ولا سجلًّا تجاريًّا
 * ولا آيبان. ما لم يوثِّقه المالك يبقى `null`، وعرضُ السعر المطبوع يكتب بجانبه
 * «قيد التوثيق» بدل أن يفبرك سطرًا يبدو رسميًا ثم يسقط عند أول مكالمة من المشتريات.
 * الحقول تُقرأ من `.env` إن وُضعت، فتُملأ مرةً واحدة بلا تعديل ملفات واحدًا واحدًا.
 */
const env = (k) =>
  String(import.meta.env?.[k] || '')
    .trim()
    .replace(/^"|"$/g, '')

/** نصّ بيئيّ أو null — الفراغ «غير مُدخَل»، لا «نصٌّ فارغ مُوثَّق» */
const field = (...keys) => {
  for (const k of keys) {
    const v = env(k)
    if (v) return v
  }
  return null
}

/** ضريبة القيمة المضافة في السعودية: ١٥٪، والأسعار في المتجر تُعرض شاملةً إياها */
export const VAT_RATE = 0.15
/** كم يبقى العرض صالحًا — يومًا تقويميًّا من تاريخ طلبه */
export const QUOTE_VALID_DAYS = 30

export const COMPANY = {
  name: { ar: 'قالب', en: 'Qalb' },
  /** الاسم كما في السجل التجاري — يُطبع في ترويسة العرض والفاتورة */
  legalName: field('VITE_QALB_LEGAL_NAME'),
  crNumber: field('VITE_QALB_CR'),
  vatNumber: field('VITE_QALB_VAT'),
  iban: field('VITE_QALB_IBAN'),
  bank: field('VITE_QALB_BANK'),
  address: { ar: 'جدة — المملكة العربية السعودية', en: 'Jeddah, Saudi Arabia' },
  /** رقمٌ يُتَّصل به للمشتريات: لا يُعرض إلا إذا وُضع، فلا زرّ «اتصل بنا» بلا هاتف */
  phone: field('VITE_QALB_PHONE'),
  /** رابط حجز اجتماع (Cal.com / Meet / Teams) — إن وُجد صار الزرّ يحجز فعلًا */
  bookingUrl: field('VITE_QALB_BOOKING'),
  /**
   * منصة اعتماد: 'none' هي الحالة الصادقة ما لم يوثِّق المالك خلافها. بعض الجامعات
   * الحكومية لا تشتري إلا عبرها، فأمانةُ الحال عند أول رسالة توفّر أسبوع الطرفين،
   * ومن موّثّقًا يطبع رقمه في العرض.
   */
  etimad: field('VITE_QALB_ETIMAD') || 'none',
}

/** الحقل مُدخَلٌ فعلًا؟ (النصّ الفارغ أو المسافات لا تُعدّ توثيقًا) */
export const isSet = (v) => (typeof v === 'string' ? v.trim().length > 0 : v != null && v !== false && v !== false)

/** هل يمكن إصدار عرض سعر «مكتمل التوثيق»؟ المشتريات ترفض الناقص، فلا نُوهم بالجاهزية */
export const quoteReady = () => isSet(COMPANY.legalName) && isSet(COMPANY.crNumber) && isSet(COMPANY.vatNumber)

/** الحقول الناقصة، بأسمائها العربية، ليقال عنها صراحةً في الورقة وفي اللوحة */
export const quoteMissing = () =>
  [
    ['legalName', 'الاسم التجاري'],
    ['crNumber', 'رقم السجل التجاري'],
    ['vatNumber', 'الرقم الضريبي'],
    ['iban', 'الآيبان'],
    ['bank', 'اسم البنك'],
  ]
    .filter(([k]) => !isSet(COMPANY[k]))
    .map(([, label]) => label)

/**
 * من سعرٍ شاملٍ إلى (أساس + ضريبة + إجمالي) — الحساب بالعكس لأن معروضاتنا شاملة:
 * الأساس = الإجمالي ÷ ١٫١٥، والضريبةُ الفرق، فالرقمان يجمعان إلى الإجمالي بلا قرشٍ ضائع.
 */
export function vatSplit(inclusive) {
  const total = Math.round((Number(inclusive) || 0) * 100) / 100
  const base = Math.round((total / (1 + VAT_RATE)) * 100) / 100
  const vat = Math.round((total - base) * 100) / 100
  return { base, vat, total }
}

/** الضريبة كنسبةٍ تُطبع: ١٥٪، لا «ضريبة» مبهمة */
export const vatLabel = () => `${Math.round(VAT_RATE * 100)}%`

export default { COMPANY, VAT_RATE, QUOTE_VALID_DAYS, isSet, quoteReady, quoteMissing, vatSplit, vatLabel }
