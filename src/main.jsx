import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { LangProvider } from './i18n'
import { dictOf, initialLang, loadDict } from './i18n/loader'
import { StoreProvider } from './store/StoreContext'
import App from './App'
import './index.css'

const mount = (dicts) =>
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter>
        <LangProvider dicts={dicts}>
          <StoreProvider>
            <App />
          </StoreProvider>
        </LangProvider>
      </BrowserRouter>
    </React.StrictMode>,
  )

/**
 * العربية ثابتة في الحزمة، فالرسم فوريٌّ ولا ينتظر شبكة. وإن فتح الزائر الصفحة
 * بالإنجليزية (`?lang=en` أو لغةٌ محفوظة في جهازه) تُطلب تلك الـchunk **قبل**
 * الرسم: فلا ومضةَ عربيةٍ لزائرٍ جاء بالإنجليزية، وثمنُها طلبٌ إضافيٌّ واحد يدفعه
 * من اختار الإنجليزية فعلًا — لا كلُّ زائرٍ عربيّ كما كان حين حملت الحزمةُ
 * القاموسين معًا.
 *
 * وإن تعذّرت الـchunk (نشرٌ جديد تحت تبويبٍ مفتوح، أو انقطاع) يُرسم المتجر
 * بالعربية بدل شاشةٍ بيضاء: الاحتياطُ لغةٌ كاملة، لا مفاتيحُ خام.
 */
if (initialLang() === 'en') {
  loadDict('en').then(
    (en) => mount({ ar: dictOf('ar'), en }),
    () => mount(null),
  )
} else {
  mount(null)
}
