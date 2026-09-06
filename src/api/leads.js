/**
 * عميلُ طلبات الجهات. في وضع rest يُرسَل الطلبُ إلى server/leads.js فيصير سطرًا في
 * الدفتر؛ وبدون خادم يُحفظ في هذا المتصفح ويُقال ذلك صراحةً — لا «تم الإرسال» بلا
 * مُرسَلٍ إليه، ولا نجاحٍ مُختلَق. والصفحة تقرأ `where` من الردّ فتخبر الإنسان أين ذهب
 * طلبه فعلًا: دفترَ الخادم، أم جهازَه هو، أم لا مكان لأن الشبكة سقطت (وعندها يبقى البريد).
 */
import { clearLocalLeads, readLocalLeads, saveLocalLead } from '../data/leads'
import { BASE, apiMode } from './index'

const store = () => (typeof localStorage !== 'undefined' ? localStorage : null)

export const leads = {
  mode: apiMode,
  /** يعيد { status, body } — والفحصُ حالةٌ لا استثناء: لا نرمي على شبكةٍ ساقطة */
  async submit(value) {
    if (!value) return { status: 0, body: { error: 'invalid', where: 'none' } }
    if (apiMode === 'rest') {
      try {
        const res = await fetch(`${BASE}/leads`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(value),
        })
        let body = {}
        try {
          body = await res.json()
        } catch {
          body = {}
        }
        return { status: res.status, body: { where: res.ok ? 'ledger' : 'server', ...body } }
      } catch (e) {
        return { status: 0, body: { error: 'network', where: 'none', why: String(e?.message || e).slice(0, 90) } }
      }
    }
    const r = saveLocalLead(store(), value)
    return { status: r.saved ? 201 : 0, body: { ok: r.saved, local: true, where: r.saved ? 'browser' : 'none', count: r.count, quote: value.quote } }
  },
  local: () => readLocalLeads(store()),
  clearLocal: () => clearLocalLeads(store()),
}

export default leads
