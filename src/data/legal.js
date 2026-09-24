/**
 * الصفحات القانونية — مصدرٌ واحد للنسختين.
 *
 * قبل v1.8.0 كان كلُّ نصٍّ قانونيٍّ مكتوبًا داخل صفحةٍ واحدة (`/legal`)، فأرْبعةُ
 * روابطَ في التذييل تنزل على شريط حقوق. اليوم لكلِّ صفحةٍ مسارها (`/terms`
 * و`/privacy` و`/refunds`) وللقسم مصدرٌ واحد هنا تقرأه الصفحتان — فلا يختلف سطرٌ
 * بين «الشروط» في صفحتها و«الشروط» في الصفحة الجامعة.
 *
 * وقسمُ التواصل والضريبة (`contact`) ليس نصًّا مكتوبًا هنا: حقولُه تُقرأ من
 * src/data/company.js وقت الرسم، فما لم يُوثِّقه المالك يظهر «قيد التوثيق» ولا
 * يُطبع رقمٌ مُختلَق.
 */

/** الأقسام الأربعة كما هي في الصفحة الجامعة — `paras` مفاتيحُ في القاموس */
export const SECTIONS = [
  { id: 'terms', h: 'legal.terms', paras: ['legal.t1', 'legal.t2', 'legal.t3', 'legal.t4', 'legal.t5'] },
  { id: 'privacy', h: 'legal.privacy', paras: ['legal.p1', 'legal.p2', 'legal.p3', 'legal.p4', 'legal.p5', 'legal.p6', 'legal.p7', 'legal.p8'] },
  { id: 'refund', h: 'legal.refund', paras: ['legal.r1', 'legal.r2', 'legal.r3', 'legal.r4'] },
  { id: 'licence', h: 'legal.licence', paras: ['legal.l1', 'legal.l2', 'legal.l3', 'legal.l4'] },
]

export const sectionById = (id) => SECTIONS.find((s) => s.id === id) || null

export default SECTIONS
