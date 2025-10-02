import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Login from './pages/Login.jsx'
import POS from './pages/POS.jsx'
import Admin from './pages/Admin.jsx'
import Reports from './pages/Reports.jsx'
import PrintPreview from './pages/PrintPreview.jsx'
import TableMap from './pages/TableMap.jsx'
import useAuth from './store/useAuth.js'
import { useTheme } from './store/useTheme.js'
import { LayoutGrid, ReceiptText, Settings2, LogIn, LogOut, Moon, Sun, HelpCircle, X } from 'lucide-react'

/* ====== SAT WIDGET ====== */
function ClockWidget(){
  const [now, setNow] = useState(()=> new Date())
  useEffect(()=>{
    const t = setInterval(()=> setNow(new Date()), 1000)
    return ()=> clearInterval(t)
  },[])
  const time = now.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const date = now.toLocaleDateString('sr-RS', { weekday:'short', day:'2-digit', month:'2-digit', year:'numeric' })
  return (
    <div className="rounded-2xl border border-neutral-200/70 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 px-3 py-3 grid gap-1.5 text-center shadow-sm">
      <div className="text-2xl font-bold tracking-wider tabular-nums">{time}</div>
      <div className="text-xs opacity-70 uppercase tracking-wide">{date}</div>
    </div>
  )
}

/* ====== DESNI SIDEBAR ====== */
function SideBar(){
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const loc = useLocation()
  const [showHelp, setShowHelp] = useState(false)
  if (loc.pathname.startsWith('/print')) return null

  // Jedinstvene dimenzije za SVA dugmad/linkove
  const linkBase = "h-11 flex items-center gap-2.5 px-3 rounded-xl touch-btn transition border"
  const linkIdle = "text-neutral-900 bg-white/70 hover:bg-white dark:text-neutral-200 dark:bg-neutral-900/60 dark:hover:bg-neutral-900 border-neutral-200/70 dark:border-neutral-800"
  const linkActive = "bg-brand/15 border-brand text-neutral-900 dark:text-white"

  const btnBase = "h-11 w-full flex items-center justify-center gap-2 px-3 rounded-xl touch-btn transition border active:scale-[0.98]"
  const btnNeutral = "bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border-neutral-200 dark:border-neutral-800"

  const NavItem = ({to, icon:Icon, children, rightAdornment=null, className=''}) => (
    <NavLink
      to={to}
      className={({isActive})=>`${linkBase} ${isActive? linkActive: linkIdle} ${className}`}
    >
      <Icon size={18}/>
      <span className="font-medium">{children}</span>
      {rightAdornment}
    </NavLink>
  )

  return (
    <>
      {/* Scoped scrollbar za Help modal */}
      <style>{`
        .help-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(100,100,100,.6) transparent;
        }
        .help-scroll::-webkit-scrollbar { width: 10px; }
        .help-scroll::-webkit-scrollbar-track { background: transparent; }
        .help-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(0,0,0,.25), rgba(0,0,0,.35));
          border-radius: 10px; border: 2px solid transparent; background-clip: content-box;
        }
        :root.light .help-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(0,0,0,.2), rgba(0,0,0,.28));
        }
      `}</style>

      <aside className="no-print fixed top-0 right-0 h-screen w-64 bg-white/75 dark:bg-neutral-950/90 backdrop-blur-xl border-l border-neutral-200 dark:border-neutral-800 flex flex-col">
        {/* LOGO — ~20% veći od ranijeg (h-28 -> ~8.4rem) bez bočnih margina */}
        <div className="border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-center" style={{ height: '8.4rem' }}>
          <img
            src={theme === 'light' ? '/logo-light.png' : '/logo-dark.png'}
            alt="Logo"
            className="w-full object-contain block"
            style={{ height: '8.4rem', margin: 0, padding: 0 }}
          />
        </div>

        {/* GLAVNA NAV (gore) */}
        <nav className="flex-1 overflow-y-auto p-3 pt-4 flex flex-col gap-2">
          <NavItem to="/" icon={LayoutGrid}>Stolovi</NavItem>
          <NavItem to="/pos" icon={ReceiptText}>Brzo kucanje</NavItem>
          <NavItem to="/reports" icon={ReceiptText}>Presek</NavItem>

          {/* Admin ispod Preseka, samo kad je ulogovan. Dodata crvena tačka (indikator) */}
          {user && (
            <NavItem
              to="/admin"
              icon={Settings2}
              rightAdornment={
                <span className="ml-auto inline-flex items-center">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-40"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                </span>
              }
            >
              Admin
            </NavItem>
          )}
        </nav>

        {/* DONJA ZONA */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
          {/* Tema */}
          <button
            onClick={toggle}
            className={`${btnBase} ${btnNeutral}`}
            title="Tema"
          >
            {theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/> }
            <span>Tema</span>
          </button>

          {/* Pomoć */}
          <button
            onClick={()=>setShowHelp(true)}
            className={`${btnBase} ${btnNeutral}`}
            title="Pomoć"
          >
            <HelpCircle size={18}/>
            <span>Pomoć</span>
          </button>

          {/* Sat između Pomoći i Auth-a */}
          <ClockWidget/>

          {/* Auth */}
          {user ? (
            <button
              onClick={logout}
              className={`${btnBase} ${btnNeutral}`}
              title="Odjava"
            >
              <LogOut size={18}/>
              <span>Odjava</span>
            </button>
          ) : (
            <NavLink
              className={`${linkBase} ${linkIdle} w-full justify-center`}
              to="/login"
              title="Prijava"
            >
              <LogIn size={18}/>
              <span>Prijava</span>
            </NavLink>
          )}
        </div>
      </aside>

      {/* HELP MODAL – redizajn; “×” za zatvaranje; lep scrollbar */}
      {showHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px]" onClick={()=>setShowHelp(false)} />
          <div className="relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl w-[min(860px,94vw)] max-h-[88vh] overflow-hidden fade-up">
            {/* Header */}
            <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between sticky top-0 bg-white/90 dark:bg-neutral-900/90 backdrop-blur z-10">
              <div className="text-lg font-semibold flex items-center gap-2"><HelpCircle size={18}/> Pomoć</div>
              <button
                onClick={()=>setShowHelp(false)}
                className="h-11 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 transition active:scale-[0.98] inline-flex items-center justify-center"
                aria-label="Zatvori pomoć"
                title="Zatvori"
              >
                <X size={20}/>
              </button>
            </div>

            {/* Scrollable content */}
            <div className="help-scroll px-6 py-5 overflow-auto" style={{ maxHeight: 'calc(88vh - 56px)' }}>
              <div className="space-y-5 text-sm leading-6">
                <section>
                  <div className="font-semibold mb-1.5">Mapa stolova</div>
                  <ul className="list-disc pl-5 space-y-1.5 opacity-90">
                    <li>Klik na sto otvara POS za taj sto. Crveno = sto sa stavkama, zeleno = slobodno.</li>
                    <li>Za premeštanje stola uđite kao admin → kliknite <b>Otključano</b>, pa prevucite sto. <i>Brisanje stola nije moguće ako ima aktivnih stavki.</i></li>
                  </ul>
                </section>

                <section>
                  <div className="font-semibold mb-1.5">POS i gosti (G1–G5)</div>
                  <ul className="list-disc pl-5 space-y-1.5 opacity-90">
                    <li>Dodavanje artikla ide u aktivnog gosta. Tab <b>Svi</b> prikazuje sve stavke.</li>
                    <li><b>Štampaj sve</b> (na tabu “Svi”) štampa ceo sto i arhivira račun.</li>
                    <li><b>Štampaj Gx</b> štampa i arhivira samo stavke izabranog gosta.</li>
                    <li><b>Podeli račun (deo)</b> – odaberite količine i štampajte samo taj deo; preostalo ostaje na stolu.</li>
                  </ul>
                </section>

                <section>
                  <div className="font-semibold mb-1.5">Štampa (80mm)</div>
                  <ul className="list-disc pl-5 space-y-1.5 opacity-90">
                    <li>Predračun koristi print CSS za 80mm termalni štampač. Napomena: <b>ovo nije fiskalni račun</b>.</li>
                    <li>Offline/PWA radi u produkciji sa Service Worker-om.</li>
                  </ul>
                </section>

                <section>
                  <div className="font-semibold mb-1.5">Presek (smenski)</div>
                  <ul className="list-disc pl-5 space-y-1.5 opacity-90">
                    <li>Prikazuje promet i artikle od poslednjeg preseka. Štampanjem se trenutni redovi označavaju kao odštampani i ne ulaze u sledeći presek.</li>
                    <li>Istorija preseka i oznake čuvaju se lokalno (localStorage).</li>
                  </ul>
                </section>

                <section>
                  <div className="font-semibold mb-1.5">Admin panel</div>
                  <ul className="list-disc pl-5 space-y-1.5 opacity-90">
                    <li><b>Proizvodi/Kategorije</b> – dodavanje/izmena/brisanje, ikonice kategorija, sortiranje.</li>
                    <li><b>Uvoz CSV</b> – resetuje postojeće artikle i unosi nove (Kategorija, Naziv artikla, Cena (RSD)).</li>
                    <li><b>Računi</b> – pregled/brisanje arhiviranih računa, filteri po datumu, stolu, tekstu i iznosu.</li>
                  </ul>
                </section>

                <section>
                  <div className="font-semibold mb-1.5">Saveti za dodirne ekrane</div>
                  <ul className="list-disc pl-5 space-y-1.5 opacity-90">
                    <li>Sva dugmad su iste visine (touch-friendly).</li>
                    <li>Login koristi ekran-numpad (PIN).</li>
                  </ul>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ====== BACK dugme ====== */
export function BackBar({ to='/', label='Nazad na stolove' }){
  const nav = useNavigate()
  return (
    <div className="no-print mb-3">
      <button
        onClick={()=>nav(to)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:border-neutral-800 touch-btn transition"
      >
        <span className="text-lg">←</span><span className="font-medium">{label}</span>
      </button>
    </div>
  )
}

/* ====== ROOT APP ====== */
export default function App(){
  const { theme } = useTheme()
  useEffect(()=>{
    const root = document.documentElement
    root.classList.remove('light','dark')
    root.classList.add(theme)
    const bootLogo = document.getElementById('boot-logo')
    if (bootLogo) bootLogo.src = theme === 'light' ? '/logo-light.png' : '/logo-dark.png'
  }, [theme])

  return (
    <div className="min-h-screen flex">
      {/* MAIN CONTENT */}
      <div className="flex-1 pr-64">
        <Routes>
          <Route path="/" element={<TableMap/>}/>
          <Route path="/login" element={<Login/>}/>
          <Route path="/pos" element={<POS/>}/>
          <Route path="/admin" element={<Admin/>}/>
          <Route path="/reports" element={<Reports/>}/>
          <Route path="/print/:type/:id" element={<PrintPreview/>} />
        </Routes>
      </div>
      {/* SIDEBAR */}
      <SideBar/>
    </div>
  )
}
