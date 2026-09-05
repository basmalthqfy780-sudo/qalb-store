/**
 * عميل مقاعد المؤسسة. لا وضع محليّ له عن قصد: لا يملك المتصفح دفتر مقاعد، ولا يجوز
 * أن يوحي نموذجٌ محليّ بأن الجهة اشترت عقدًا. فما يُقرأ هنا يُقرأ من خادم الطلبات
 * (server/orgs.js)، وإلا قيل للطالب إن الرمز يُراجَع يدويًا — بلا نجاحٍ مُختلَق.
 */
import { BASE, apiMode } from './index'

/** لا JSON في ردٍّ بلا جسم (405 مثلًا): الفشل هنا حالةٌ لا استثناء */
const readJson = async (res) => {
  try {
    return await res.json()
  } catch {
    return {}
  }
}

const LOCAL = Promise.resolve({ status: 0, body: { error: 'local' } })

export const orgs = {
  mode: apiMode,
  /** استبدال مقعد: يعيد الطلب نفسه الذي يعيده الشراء الفردي — مفتاحٌ وحزمةٌ موقّعة */
  redeem: async (payload) => {
    if (apiMode !== 'rest') return LOCAL
    const res = await fetch(`${BASE}/org/redeem`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return { status: res.status, body: await readJson(res) }
  },
  /** تراجع الجهة مقاعدها برمزها: عددٌ وقوالب، لا أسماء ولا بريدا الطلاب */
  seats: async (code) => {
    if (apiMode !== 'rest') return LOCAL
    const res = await fetch(`${BASE}/org/${encodeURIComponent(String(code || '').trim())}`)
    return { status: res.status, body: await readJson(res) }
  },
}

export default orgs
