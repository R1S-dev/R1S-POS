import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuth from '../store/useAuth.js'
import { Card, Input, Label } from '../components/UI.jsx'

/* Ekranski numpad – large touch targeti + male animacije */
function Numpad({ onInput, onBackspace, onClear, onEnter, disabled }) {
  const keys = ['1','2','3','4','5','6','7','8','9','C','0','←']

  const baseBtn =
    'px-4 py-4 rounded-xl text-lg font-semibold touch-btn border ' +
    'transition active:scale-95 select-none ' +
    'shadow-sm hover:shadow border-neutral-200 dark:border-neutral-800 ' +
    'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700'

  const clearBtn =
    'px-4 py-4 rounded-xl text-lg font-semibold touch-btn border ' +
    'transition active:scale-95 select-none shadow-sm hover:shadow ' +
    'bg-red-600 text-white hover:bg-red-700 border-red-700'

  const backBtn =
    'px-4 py-4 rounded-xl text-lg font-semibold touch-btn border ' +
    'transition active:scale-95 select-none shadow-sm hover:shadow ' +
    'bg-neutral-700 text-white hover:bg-neutral-600 border-neutral-700'

  const confirmBtn =
    'col-span-3 px-4 py-3 rounded-xl text-lg font-bold touch-btn ' +
    'bg-brand hover:bg-brand-dark text-white transition active:scale-95 shadow'

  return (
    <div className="grid grid-cols-3 gap-2 select-none mt-4">
      {keys.map(k=>{
        const isClear = k === 'C'
        const isBack = k === '←'
        const cls = isClear ? clearBtn : isBack ? backBtn : baseBtn
        return (
          <button
            key={k}
            disabled={disabled}
            onClick={()=>{
              if (isClear) onClear?.()
              else if (isBack) onBackspace?.()
              else onInput?.(k)
            }}
            className={cls}
          >
            {k}
          </button>
        )
      })}
      <button onClick={onEnter} disabled={disabled} className={confirmBtn}>
        Potvrdi
      </button>
    </div>
  )
}

export default function Login(){
  const { user, login } = useAuth()
  const nav = useNavigate()

  // Username ne tražimo – podrazumevamo 'admin'
  const u = 'admin'
  const [p, setP] = useState('')
  const [msg, setMsg] = useState('')
  const passRef = useRef(null)

  // Anti-autofill + fokus
  useEffect(()=>{
    setTimeout(()=>{
      if (passRef.current) {
        passRef.current.value = ''
        passRef.current.setAttribute('autocomplete', 'new-password')
        try { passRef.current.focus() } catch {}
      }
    }, 0)
  }, [])

  function submit(){
    const res = login(u, p)
    if (!res.ok) {
      setMsg(res.error || 'Prijava neuspešna')
    } else {
      // Redirect na početnu (glavnu) stranicu
      nav('/', { replace: true })
    }
  }

  function onSubmit(e){
    e.preventDefault()
    submit()
  }

  if (user){
    // Ako je već ulogovan, pošalji ga na početnu
    nav('/', { replace: true })
    return null
  }

  return (
    <div
      className="
        min-h-[100svh] w-full
        grid place-items-center
        p-4
        bg-gradient-to-br from-neutral-100 via-white to-neutral-200
        dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950
      "
    >
      <Card className="w-[min(420px,92vw)] p-6 border border-neutral-200/70 dark:border-neutral-800/80 shadow-lg fade-up">
        <div className="text-center mb-4">
          <div className="text-2xl font-bold">Prijava</div>
          <div className="text-sm opacity-70 mt-1">Unesite PIN za pristup</div>
        </div>

        {/* Samo PIN/lozinka, bez username polja */}
        <form onSubmit={onSubmit} autoComplete="off" className="space-y-3">
          <div>
            <Label>PIN / Lozinka</Label>
            <Input
              ref={passRef}
              type="password"
              value={p}
              onChange={e=>setP(e.target.value.replace(/[^\d]/g,''))}
              inputMode="numeric"
              pattern="[0-9]*"
              enterKeyHint="done"
              placeholder="••••••"
              name="pin"
              className="text-center text-xl tracking-widest"
            />
          </div>

          {msg && (
            <div className="text-red-500 text-sm text-center animate-[fadeUp_.18s_ease_both]">
              {msg}
            </div>
          )}
          {/* Nema posebnog "Prijavi se" dugmeta – potvrda je kroz numpad */}
        </form>

        {/* Ekranski numpad za touchscreen */}
        <Numpad
          disabled={false}
          onInput={(d)=> setP(prev => (prev + String(d)).slice(0,12))}
          onBackspace={()=> setP(prev => prev.slice(0,-1))}
          onClear={()=> setP('')}
          onEnter={submit}
        />
      </Card>
    </div>
  )
}
