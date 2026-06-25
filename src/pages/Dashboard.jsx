import { useState, useEffect, useRef } from 'react'
import { getLiveAlerts, getDashboardStats } from '../lib/db'

// ── REALISTIC INDIA SVG PATH ─────────────────────────────────
const INDIA_PATH = `M 280,45 L 295,42 L 318,38 L 340,35 L 358,40 L 372,52 L 385,58
  L 395,70 L 400,85 L 408,98 L 415,112 L 420,128 L 418,145 L 412,158
  L 420,170 L 428,182 L 432,196 L 438,210 L 442,225 L 438,238 L 430,248
  L 435,262 L 438,278 L 432,292 L 425,305 L 418,318 L 410,332 L 400,345
  L 390,358 L 378,370 L 365,380 L 352,390 L 340,398 L 328,408 L 318,418
  L 308,430 L 300,442 L 292,455 L 285,468 L 278,480 L 272,492 L 265,505
  L 258,518 L 250,530 L 242,518 L 235,505 L 228,492 L 222,480 L 215,468
  L 208,455 L 200,442 L 192,430 L 182,418 L 170,408 L 158,398 L 148,388
  L 138,375 L 128,362 L 120,348 L 115,332 L 112,315 L 110,298 L 112,282
  L 118,268 L 122,252 L 118,238 L 112,225 L 108,210 L 105,195 L 102,180
  L 98,165 L 95,150 L 95,135 L 98,120 L 105,108 L 112,95 L 120,82
  L 130,70 L 142,60 L 155,52 L 168,46 L 182,42 L 198,38 L 215,36
  L 232,35 L 248,36 L 262,38 L 275,42 Z
  M 335,530 L 345,515 L 355,502 L 362,490 L 368,478 L 358,472 L 348,480
  L 338,492 L 328,505 L 320,518 L 325,530 Z
  M 252,530 L 258,545 L 262,558 L 258,570 L 250,578 L 242,570 L 238,558
  L 242,545 Z`

// ── HOTSPOTS (accurate lat/lon mapped to SVG 500x600 viewBox) ─
const HOTSPOTS = [
  { city:'Delhi NCR',  reports:847, type:'Digital Arrest Scams', sev:'danger', x:262, y:138 },
  { city:'Mumbai',     reports:623, type:'UPI Fraud',            sev:'danger', x:138, y:285 },
  { city:'Bengaluru',  reports:534, type:'Job Scams',            sev:'danger', x:192, y:388 },
  { city:'Hyderabad',  reports:289, type:'Courier Fraud',        sev:'warn',   x:220, y:320 },
  { city:'Kolkata',    reports:198, type:'Counterfeit Currency', sev:'warn',   x:352, y:218 },
  { city:'Pune',       reports:312, type:'Investment Scams',     sev:'warn',   x:148, y:302 },
  { city:'Lucknow',    reports:156, type:'OTP Fraud',            sev:'warn',   x:280, y:168 },
  { city:'Ahmedabad',  reports:201, type:'Job Scams',            sev:'warn',   x:128, y:218 },
  { city:'Jaipur',     reports:132, type:'Digital Arrest',       sev:'safe',   x:200, y:158 },
  { city:'Chennai',    reports:178, type:'OTP Fraud',            sev:'warn',   x:222, y:410 },
]

const SEV_COLOR = { danger:'#E05252', warn:'#F5A623', safe:'#00C896' }
const SEV_GLOW  = { danger:'rgba(224,82,82,0.4)', warn:'rgba(245,166,35,0.4)', safe:'rgba(0,200,150,0.4)' }

const FEED_DATA = [
  { icon:'📞', type:'danger', label:'Digital Arrest Scam',  text:'Fake ED officer targeting retirees — do not engage', city:'Delhi' },
  { icon:'💸', type:'warn',   label:'UPI Fraud',            text:'Rs.48,000 siphoned via QR redirect scam', city:'Pune' },
  { icon:'🎭', type:'danger', label:'Deepfake Call',        text:'AI voice clone impersonating a judge reported', city:'Hyderabad' },
  { icon:'🏧', type:'warn',   label:'Counterfeit Note',     text:'Fake Rs.500 batch flagged at 3 ATMs', city:'Kolkata' },
  { icon:'📱', type:'safe',   label:'Warning Issued',       text:'TRAI SIM-block scam spreading via WhatsApp', city:'Nationwide' },
  { icon:'💼', type:'warn',   label:'Job Scam',             text:'89 new victims of work-from-home fraud scheme', city:'Bengaluru' },
  { icon:'🔐', type:'danger', label:'OTP Interception',     text:'SIM-swap fraud cluster detected — 3 telecom nodes', city:'Mumbai' },
  { icon:'🛒', type:'warn',   label:'Shopping Fraud',       text:'Fake e-commerce site using cloned Flipkart UI', city:'Jaipur' },
]

const AI_INSIGHTS = [
  '🤖 AI detected a 34% spike in digital arrest calls targeting mobile numbers starting with +91-98 — likely a scraped database.',
  '🧠 Pattern analysis: UPI fraud attempts peak between 2 PM–4 PM IST on weekdays. Alertness advised during these hours.',
  '📊 Counterfeit Rs.500 notes share identical serial prefix YAK — RBI has been notified. Reject notes with this prefix.',
  '🔍 New scam script identified: callers now claim to be from "Cyber Crime Branch, Ministry of Electronics" — always a fraud.',
  '⚡ Real-time: 3 new mule account clusters flagged in Maharashtra — coordinated UPI fraud ring suspected.',
  '🌐 Cross-city correlation: same voice fingerprint used in scam calls in Delhi, Pune, and Bengaluru this week.',
]

function useCounter(target, duration = 1800) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let start = 0
    const step = target / (duration / 16)
    const t = setInterval(() => {
      start = Math.min(start + step, target)
      setVal(Math.floor(start))
      if (start >= target) clearInterval(t)
    }, 16)
    return () => clearInterval(t)
  }, [target])
  return val
}

export default function Dashboard() {
  const [alerts, setAlerts]         = useState(FEED_DATA)
  const [stats, setStats]           = useState({ reportsToday: 2847, checksToday: 1204, scansToday: 389 })
  const [tip, setTip]               = useState(null)
  const [aiIdx, setAiIdx]           = useState(0)
  const [aiVisible, setAiVisible]   = useState(true)
  const [pulseHot, setPulseHot]     = useState(null)
  const [liveCount, setLiveCount]   = useState(2847)
  const [newAlert, setNewAlert]     = useState(null)

  const r1 = useCounter(2847)
  const r2 = useCounter(1204)
  const r3 = useCounter(389)
  const r4 = useCounter(847)

  // Rotate AI insight every 6s
  useEffect(() => {
    const id = setInterval(() => {
      setAiVisible(false)
      setTimeout(() => { setAiIdx(i => (i + 1) % AI_INSIGHTS.length); setAiVisible(true) }, 400)
    }, 6000)
    return () => clearInterval(id)
  }, [])

  // Simulate live incoming alerts every 4s
  useEffect(() => {
    getLiveAlerts(8).then(d => { if (d?.length) setAlerts(d) }).catch(() => {})
    getDashboardStats().then(d => {
      if (d.reportsToday > 0) setStats(d)
    }).catch(() => {})

    const id = setInterval(() => {
      const next = FEED_DATA[Math.floor(Math.random() * FEED_DATA.length)]
      setNewAlert(next)
      setAlerts(prev => [next, ...prev.slice(0, 7)])
      setPulseHot(Math.floor(Math.random() * HOTSPOTS.length))
      setLiveCount(c => c + Math.floor(Math.random() * 3) + 1)
      setTimeout(() => { setNewAlert(null); setPulseHot(null) }, 2000)
    }, 4000)
    return () => clearInterval(id)
  }, [])

  const STAT_CARDS = [
    { n: r1 || stats.reportsToday || 2847, l:'Reports today',     c:'#E05252' },
    { n: r2 || stats.checksToday  || 1204, l:'Scam checks',       c:'#00C896' },
    { n: r3 || stats.scansToday   || 389,  l:'Currency scans',    c:'#4FA3D1' },
    { n: r4 || 847,                         l:'Cities monitored',  c:'#F5A623' },
  ]

  return (
    <div style={{ paddingTop:64, minHeight:'100vh', background:'var(--ink)' }}>
      {/* HEADER */}
      <section style={{ background:'var(--surface)', padding:'48px 0 36px', borderBottom:'1px solid var(--border)' }}>
        <div className="wrap">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:16 }}>
            <div>
              <p className="label-cap">Live Threat Dashboard</p>
              <h1 className="heading" style={{ fontSize:'clamp(1.8rem,4vw,2.6rem)', color:'#fff', margin:'10px 0 6px' }}>
                Active fraud patterns across India
              </h1>
              <p style={{ color:'var(--muted)', fontSize:'0.9rem' }}>अपने शहर में सक्रिय घोटाले देखें — हर घंटे अपडेट होता है</p>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span className="live-pill"><span className="dot"/>Live</span>
              <span style={{ fontFamily:"'Sora',sans-serif", fontSize:'1.1rem', fontWeight:800, color:'#fff' }}>
                {liveCount.toLocaleString('en-IN')}
              </span>
              <span style={{ fontSize:'0.75rem', color:'var(--muted)' }}>total today</span>
            </div>
          </div>
        </div>
      </section>

      <section style={{ background:'var(--ink)', paddingTop:36 }}>
        <div className="wrap">

          {/* STAT CARDS */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }} className="stat-g">
            {STAT_CARDS.map((s, i) => (
              <div key={i} className="card" style={{ textAlign:'center', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse at 50% 0%,${s.c}12,transparent 70%)`, pointerEvents:'none' }} />
                <span style={{ display:'block', fontFamily:"'Sora',sans-serif", fontSize:'clamp(1.4rem,3vw,2rem)', fontWeight:800, color:s.c, lineHeight:1, marginBottom:6 }}>
                  {typeof s.n === 'number' ? s.n.toLocaleString('en-IN') : s.n}
                </span>
                <span style={{ fontSize:'0.75rem', color:'var(--muted)' }}>{s.l}</span>
              </div>
            ))}
          </div>

          {/* AI INSIGHT BANNER */}
          <div style={{
            display:'flex', alignItems:'center', gap:14, marginBottom:24,
            background:'linear-gradient(135deg,rgba(0,200,150,0.06),rgba(79,163,209,0.06))',
            border:'1px solid rgba(0,200,150,0.2)', borderRadius:12, padding:'14px 20px',
          }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'rgba(0,200,150,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', flexShrink:0 }}>🤖</div>
            <div style={{ flex:1, minWidth:0 }}>
              <span style={{ fontSize:'0.67rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', color:'var(--accent)', display:'block', marginBottom:3 }}>AI Insight — Updated Live</span>
              <p style={{ fontSize:'0.84rem', color:'var(--text)', lineHeight:1.5, opacity: aiVisible ? 1 : 0, transition:'opacity 0.4s' }}>{AI_INSIGHTS[aiIdx]}</p>
            </div>
          </div>

          {/* MAP + FEED */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:18 }} className="dash-g">

            {/* ── INDIA MAP ──────────────────────────────────────── */}
            <div className="card" style={{ padding:24, minHeight:520 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <span style={{ fontFamily:"'Sora',sans-serif", fontWeight:700, fontSize:'0.95rem', color:'#fff' }}>Cybercrime Hotspots — India 2026</span>
                <span className="live-pill"><span className="dot"/>Live</span>
              </div>

              <div style={{ position:'relative', width:'100%' }}>
                <svg viewBox="60 30 380 580" style={{ width:'100%', maxHeight:460, display:'block' }} xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <filter id="glow-r"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                    <filter id="glow-y"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                    <radialGradient id="map-fill" cx="50%" cy="50%" r="50%">
                      <stop offset="0%"   stopColor="#1a4a3a"/>
                      <stop offset="100%" stopColor="#0f2d24"/>
                    </radialGradient>
                  </defs>

                  {/* India outline */}
                  <path d={INDIA_PATH} fill="url(#map-fill)" stroke="#00C896" strokeWidth="1.5" strokeOpacity="0.5" />

                  {/* State boundary hints (subtle grid lines) */}
                  <path d="M200,160 Q250,170 300,155" stroke="rgba(0,200,150,0.08)" strokeWidth="1" fill="none"/>
                  <path d="M140,250 Q200,260 280,245" stroke="rgba(0,200,150,0.08)" strokeWidth="1" fill="none"/>
                  <path d="M160,340 Q220,350 300,335" stroke="rgba(0,200,150,0.08)" strokeWidth="1" fill="none"/>

                  {/* Hotspot dots with animated ripple */}
                  {HOTSPOTS.map((h, i) => {
                    const isPulsing = pulseHot === i
                    const col = SEV_COLOR[h.sev]
                    const glow = SEV_GLOW[h.sev]
                    return (
                      <g key={i} style={{ cursor:'pointer' }}
                        onMouseEnter={() => setTip(i)}
                        onMouseLeave={() => setTip(null)}>
                        {/* Outer ripple rings */}
                        <circle cx={h.x} cy={h.y} r={isPulsing ? 28 : 22} fill={glow} opacity={isPulsing ? 0.6 : 0.25} style={{ transition:'all 0.3s' }}>
                          <animate attributeName="r" values={`${isPulsing?18:12};${isPulsing?32:24};${isPulsing?18:12}`} dur="2s" repeatCount="indefinite"/>
                          <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite"/>
                        </circle>
                        <circle cx={h.x} cy={h.y} r={isPulsing ? 18 : 14} fill={glow} opacity={isPulsing ? 0.4 : 0.15} style={{ transition:'all 0.3s' }}>
                          <animate attributeName="r" values={`${isPulsing?10:7};${isPulsing?22:16};${isPulsing?10:7}`} dur="2s" begin="0.5s" repeatCount="indefinite"/>
                          <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" begin="0.5s" repeatCount="indefinite"/>
                        </circle>
                        {/* Core dot */}
                        <circle cx={h.x} cy={h.y} r={isPulsing ? 9 : 7} fill={col}
                          filter={`url(#glow-${h.sev==='danger'?'r':'y'})`}
                          style={{ transition:'r 0.3s' }}/>
                        <circle cx={h.x} cy={h.y} r={isPulsing ? 9 : 7} fill="none" stroke="#fff" strokeWidth="1.2" opacity="0.6"/>

                        {/* Tooltip */}
                        {tip === i && (
                          <g>
                            <rect x={h.x - 80} y={h.y - 65} width={160} height={58} rx="8" fill="#111D2E" stroke="#1E3048" strokeWidth="1"/>
                            <text x={h.x} y={h.y - 46} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700" fontFamily="Sora,sans-serif">{h.city}</text>
                            <text x={h.x} y={h.y - 28} textAnchor="middle" fill={col} fontSize="10" fontFamily="Inter,sans-serif">{h.type}</text>
                            <text x={h.x} y={h.y - 13} textAnchor="middle" fill="#6B8199" fontSize="10" fontFamily="Inter,sans-serif">{h.reports} reports this week</text>
                          </g>
                        )}
                      </g>
                    )
                  })}
                </svg>
              </div>

              {/* Legend */}
              <div style={{ display:'flex', gap:18, marginTop:8, fontSize:'0.75rem', color:'var(--muted)' }}>
                {[['#E05252','High'],['#F5A623','Moderate'],['#00C896','Low']].map(([c,l]) => (
                  <span key={l} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ width:10, height:10, borderRadius:'50%', background:c, display:'inline-block', boxShadow:`0 0 6px ${c}` }}/>
                    {l}
                  </span>
                ))}
              </div>
            </div>

            {/* ── LIVE FEED ──────────────────────────────────────── */}
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="card" style={{ flex:1, overflow:'hidden' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                  <span style={{ fontFamily:"'Sora',sans-serif", fontWeight:700, fontSize:'0.9rem', color:'#fff' }}>Recent Alerts</span>
                  <span className="live-pill"><span className="dot"/>Live</span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                  {alerts.slice(0,7).map((a, i) => {
                    const col = SEV_COLOR[a.type || 'warn']
                    const isNew = i === 0 && newAlert
                    return (
                      <div key={i} style={{
                        display:'flex', gap:10, padding:'10px 0',
                        borderBottom: i < 6 ? '1px solid var(--border)' : 'none',
                        animation: isNew ? 'slideDown 0.4s ease' : 'none',
                        background: isNew ? 'rgba(0,200,150,0.04)' : 'transparent',
                        borderRadius: isNew ? 6 : 0,
                        transition:'background 0.3s',
                      }}>
                        <div style={{ width:32, height:32, borderRadius:8, background:`${col}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'0.9rem' }}>
                          {a.icon || '🔴'}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:'0.65rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:col, marginBottom:2 }}>
                            {a.label || a.fraud_type}
                          </div>
                          <div style={{ fontSize:'0.79rem', color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {a.text || a.description}
                          </div>
                          <div style={{ fontSize:'0.67rem', color:'var(--muted)', marginTop:2 }}>{a.city}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* AI Quick Stats */}
              <div className="card" style={{ background:'linear-gradient(135deg,rgba(0,200,150,0.06),rgba(13,27,42,0))', border:'1px solid rgba(0,200,150,0.18)' }}>
                <div style={{ fontSize:'0.67rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', color:'var(--accent)', marginBottom:12 }}>🤖 AI Pattern Summary</div>
                {[
                  { label:'Top scam type', value:'Digital Arrest', color:'var(--danger)' },
                  { label:'Peak fraud time', value:'2 PM – 4 PM IST', color:'var(--warn)' },
                  { label:'Most targeted', value:'Delhi NCR', color:'var(--sky)' },
                  { label:'Scam calls blocked', value:'3,241 today', color:'var(--accent)' },
                ].map((s, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <span style={{ fontSize:'0.78rem', color:'var(--muted)' }}>{s.label}</span>
                    <span style={{ fontSize:'0.78rem', fontWeight:700, color:s.color }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CITY BREAKDOWN TABLE */}
          <div className="card" style={{ marginTop:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <span style={{ fontFamily:"'Sora',sans-serif", fontWeight:700, fontSize:'0.95rem', color:'#fff' }}>City-wise Breakdown</span>
              <span style={{ fontSize:'0.75rem', color:'var(--muted)' }}>Updated hourly from NCRP data</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12 }}>
              {HOTSPOTS.sort((a,b) => b.reports - a.reports).map((h, i) => (
                <div key={i} style={{ background:'rgba(255,255,255,0.02)', border:'1px solid var(--border)', borderRadius:8, padding:'12px 14px' }}>
                  <div style={{ display:'flex', justify:'space-between', alignItems:'center', gap:8, marginBottom:8 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:SEV_COLOR[h.sev], flexShrink:0, boxShadow:`0 0 6px ${SEV_COLOR[h.sev]}` }}/>
                    <span style={{ fontWeight:700, fontSize:'0.85rem', color:'#fff', flex:1 }}>{h.city}</span>
                    <span style={{ fontFamily:"'Sora',sans-serif", fontWeight:800, fontSize:'0.9rem', color:SEV_COLOR[h.sev] }}>{h.reports}</span>
                  </div>
                  <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:4, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${(h.reports/847)*100}%`, background:SEV_COLOR[h.sev], borderRadius:4, transition:'width 1s ease' }}/>
                  </div>
                  <div style={{ fontSize:'0.7rem', color:'var(--muted)', marginTop:6 }}>{h.type}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      <style>{`
        @media(max-width:960px){.dash-g{grid-template-columns:1fr!important}.stat-g{grid-template-columns:1fr 1fr!important}}
        @media(max-width:500px){.stat-g{grid-template-columns:1fr 1fr!important}}
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .live-pill .dot { animation: liveBlink 1s ease-in-out infinite; }
        @keyframes liveBlink { 0%,100%{opacity:1} 50%{opacity:0.2} }
      `}</style>
    </div>
  )
}
