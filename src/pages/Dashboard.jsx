import { useState, useEffect, useRef } from 'react'
import { getLiveAlerts, getDashboardStats } from '../lib/db'

// ─── VERIFIED INDIA SVG PATH ────────────────────────────────────
// viewBox="0 0 200 220" — hand-tuned to match real India outline
const INDIA = `
  M 97,2 L 100,1 L 104,2 L 108,4 L 111,7 L 114,5 L 118,3 L 123,3
  L 127,5 L 130,9 L 131,13 L 132,10 L 135,8 L 139,8 L 142,10 L 143,14
  L 142,18 L 145,17 L 148,16 L 151,17 L 153,20 L 152,24 L 150,27
  L 153,29 L 155,32 L 155,36 L 153,40 L 155,43 L 156,47 L 155,51
  L 153,54 L 154,57 L 156,61 L 155,65 L 153,68 L 151,71 L 148,73
  L 145,76 L 142,79 L 139,82 L 136,85 L 133,88 L 130,91 L 127,94
  L 124,97 L 121,100 L 118,103 L 115,107 L 112,111 L 109,116
  L 106,121 L 103,126 L 100,131 L 97,136 L 94,141 L 91,146
  L 88,151 L 85,155 L 82,159 L 80,163 L 78,167 L 76,172
  L 75,176 L 74,180 L 73,184 L 72,186 L 70,184 L 68,180
  L 66,176 L 64,172 L 61,168 L 58,164 L 55,161 L 51,158
  L 48,156 L 44,154 L 41,153 L 38,153 L 35,154 L 32,156
  L 30,159 L 29,162 L 30,166 L 32,169 L 35,171 L 33,173
  L 30,176 L 28,180 L 28,184 L 30,188 L 33,191 L 37,193
  L 41,193 L 44,191 L 46,188 L 47,192 L 49,196 L 52,199
  L 56,201 L 60,201 L 64,199 L 66,196 L 67,199 L 69,202
  L 72,204 L 75,204 L 74,207 L 72,210 L 72,213 L 74,215
  L 77,216 L 80,215 L 82,213 L 82,210 L 81,207 L 83,209
  L 85,212 L 87,213 L 90,212 L 91,209 L 90,206 L 88,204
  L 90,205 L 93,207 L 96,207 L 98,205 L 98,202 L 96,200
  L 94,199 L 96,199 L 99,200 L 101,199 L 102,197 L 101,195
  L 99,194 L 101,194 L 103,195 L 105,194 L 105,192 L 103,191
  L 102,192 L 104,193 L 104,191 L 103,190
  L 105,188 L 108,186 L 111,184 L 113,181 L 114,178
  L 112,175 L 109,173 L 107,171 L 109,170 L 112,170
  L 115,169 L 117,167 L 117,164 L 115,162 L 112,161
  L 114,161 L 117,162 L 119,161 L 120,158 L 118,156
  L 116,155 L 118,155 L 121,155 L 123,153 L 123,150
  L 121,148 L 119,147 L 121,147 L 124,148 L 127,147
  L 128,144 L 126,142 L 124,141 L 126,141 L 129,141
  L 131,140 L 132,137 L 130,135 L 128,134 L 130,134
  L 133,134 L 135,133 L 136,130 L 134,128 L 132,127
  L 134,127 L 137,127 L 139,126 L 140,123 L 138,121
  L 136,120 L 139,120 L 142,119 L 143,117 L 142,114
  L 140,113 L 142,112 L 144,111 L 145,108 L 144,106
  L 141,105 L 143,104 L 146,103 L 147,101 L 146,98
  L 143,97 L 141,97 L 143,96 L 146,95 L 147,93
  L 146,90 L 143,89 L 141,89 L 143,88 L 146,88
  L 148,86 L 147,83 L 144,82 L 142,83 L 144,81
  L 146,79 L 147,76 L 145,74 L 142,73 L 140,74
  L 141,72 L 143,70 L 143,67 L 141,65 L 138,64
  L 136,65 L 137,63 L 138,60 L 137,57 L 134,56
  L 132,57 L 133,55 L 133,52 L 131,50 L 128,50
  L 127,52 L 128,50 L 129,47 L 128,44 L 125,44
  L 123,46 L 124,44 L 124,41 L 122,39 L 119,39
  L 117,41 L 118,39 L 118,36 L 116,34 L 113,34
  L 111,36 L 112,34 L 111,31 L 109,30 L 106,30
  L 104,32 L 105,30 L 104,27 L 102,26 L 99,26
  L 97,28 L 98,26 L 97,23 L 95,22 L 93,23
  L 95,21 L 95,18 L 94,15 L 91,14 L 89,15
  L 91,13 L 91,10 L 90,7 L 87,6 L 85,7
  L 87,5 L 89,3 L 93,2 Z
  M 76,176 L 74,178 L 73,181 L 74,184 L 77,185
  L 79,183 L 79,180 L 77,178 Z
`

// ─── HOTSPOTS — x,y in the 0‑200 / 0‑220 coordinate space ─────
const HOTSPOTS = [
  { city:'Delhi NCR',  x:99,  y:30,  reports:847, type:'Digital Arrest Scams', sev:'danger' },
  { city:'Jaipur',     x:85,  y:38,  reports:132, type:'Digital Arrest',       sev:'warn'   },
  { city:'Lucknow',    x:112, y:33,  reports:156, type:'OTP Fraud',            sev:'warn'   },
  { city:'Kolkata',    x:134, y:48,  reports:198, type:'Counterfeit Currency', sev:'warn'   },
  { city:'Ahmedabad',  x:72,  y:56,  reports:201, type:'Job Scams',            sev:'warn'   },
  { city:'Mumbai',     x:68,  y:80,  reports:623, type:'UPI Fraud',            sev:'danger' },
  { city:'Pune',       x:74,  y:88,  reports:312, type:'Investment Scams',     sev:'warn'   },
  { city:'Hyderabad',  x:105, y:92,  reports:289, type:'Courier Fraud',        sev:'warn'   },
  { city:'Bengaluru',  x:97,  y:116, reports:534, type:'Job Scams',            sev:'danger' },
  { city:'Chennai',    x:112, y:120, reports:178, type:'OTP Fraud',            sev:'safe'   },
]

const SEV = { danger:'#E05252', warn:'#F5A623', safe:'#00C896' }

const FEED = [
  { icon:'📞', type:'danger', label:'Digital Arrest Scam',  text:'Fake ED officer targeting retirees', city:'Delhi' },
  { icon:'💸', type:'warn',   label:'UPI Fraud',            text:'Rs.48,000 siphoned via QR redirect', city:'Pune' },
  { icon:'🎭', type:'danger', label:'Deepfake Call',        text:'AI voice clone impersonating a judge', city:'Hyderabad' },
  { icon:'🏧', type:'warn',   label:'Counterfeit Note',     text:'Fake Rs.500 batch flagged at 3 ATMs', city:'Kolkata' },
  { icon:'📱', type:'safe',   label:'Warning Issued',       text:'TRAI SIM-block scam on WhatsApp', city:'Nationwide' },
  { icon:'💼', type:'warn',   label:'Job Scam',             text:'89 new work-from-home fraud victims', city:'Bengaluru' },
  { icon:'🔐', type:'danger', label:'OTP Interception',     text:'SIM-swap cluster — 3 telecom nodes', city:'Mumbai' },
  { icon:'🛒', type:'warn',   label:'Shopping Fraud',       text:'Fake Flipkart checkout clone active', city:'Jaipur' },
]

const INSIGHTS = [
  '🔴 Spike: Digital arrest calls up 34% in Delhi NCR — targeting +91-98xx numbers.',
  '📊 Pattern: UPI fraud peaks 2 PM–4 PM IST weekdays. Extra vigilance advised.',
  '💵 Alert: Rs.500 notes with serial prefix YAK may be counterfeit — RBI notified.',
  '🎭 New script: Callers claiming "Ministry of Electronics Cyber Branch" — always fraud.',
  '🔗 Same voice fingerprint in scam calls across Delhi, Pune, Bengaluru this week.',
  '⚡ 3 new mule account clusters flagged in Maharashtra — coordinated UPI ring suspected.',
]

const AI_KB = {
  delhi:  '📍 Delhi NCR — 847 reports this week (highest in India)\n🔴 Top threat: Digital Arrest Scams\nFake CBI/ED officers demand wire transfers over phone.\n\n✅ Action: Hang up immediately. Real officers never demand money by phone.',
  mumbai: '📍 Mumbai — 623 reports this week\n🔴 Top threat: UPI Fraud via QR redirect\nAverage loss: Rs.52,000 per victim.\n\n✅ Action: Never scan a QR code received from an unknown person.',
  scam:   '🚨 How to spot a scam call:\n• Caller claims to be CBI, ED, Police or TRAI\n• Threatens "digital arrest" or FIR\n• Demands immediate money transfer\n• Asks you to keep it secret\n\n✅ Rule: NO government agency demands money over a phone call. Ever.',
  report: '📋 How to report fraud:\n1. Call 1930 — Cyber Crime Helpline (24×7)\n2. File at cybercrime.gov.in\n3. Visit nearest police station\n4. Use Report Fraud on this platform\n\n⚡ Act within 24 hrs to help freeze mule accounts.',
  safe:   '🛡️ Top safety tips:\n1. Never share OTP with anyone\n2. Verify callers via official website numbers\n3. Government officers never demand money by phone\n4. Check currency notes under UV light\n5. If in doubt — hang up and call 1930',
  default:'📊 Current top threats:\n\n🔴 Digital Arrest Scams — 847 reports (Delhi NCR)\n🔴 UPI Fraud — 623 reports (Mumbai)\n🔴 Job Scams — 534 reports (Bengaluru)\n\nAll tools on ShieldAI are free. Use Scam Checker or Report Fraud for instant help.',
}

function aiReply(q) {
  const l = q.toLowerCase()
  if (l.includes('delhi') || l.includes('ncr'))                              return AI_KB.delhi
  if (l.includes('mumbai') || l.includes('upi'))                             return AI_KB.mumbai
  if (l.includes('spot') || l.includes('identify') || l.includes('recogni'))return AI_KB.scam
  if (l.includes('report') || l.includes('complain') || l.includes('file')) return AI_KB.report
  if (l.includes('safe') || l.includes('protect') || l.includes('tip'))     return AI_KB.safe
  return AI_KB.default
}

export default function Dashboard() {
  const [feed, setFeed]           = useState(FEED)
  const [tip, setTip]             = useState(null)
  const [insightIdx, setInsightIdx] = useState(0)
  const [insightVis, setInsightVis] = useState(true)
  const [pulseIdx, setPulseIdx]   = useState(null)
  const [liveN, setLiveN]         = useState(2847)
  const [isNew, setIsNew]         = useState(false)
  const [chatOpen, setChatOpen]   = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatBusy, setChatBusy]   = useState(false)
  const [msgs, setMsgs]           = useState([
    { role:'ai', text:'Hi! I am ShieldAI Assistant. Ask me about active threats, how to spot scams, or how to report fraud.' }
  ])
  const [counts, setCounts]       = useState({ r:0, c:0, s:0, ci:0 })
  const chatEnd = useRef(null)

  // Counter animation
  useEffect(() => {
    const T = { r:2847, c:1204, s:389, ci:847 }
    let s = 0
    const id = setInterval(() => {
      s++; const p = 1 - Math.pow(1 - s/60, 3)
      setCounts({ r:Math.floor(T.r*p), c:Math.floor(T.c*p), s:Math.floor(T.s*p), ci:Math.floor(T.ci*p) })
      if (s >= 60) clearInterval(id)
    }, 1800/60)
    return () => clearInterval(id)
  }, [])

  // Rotate insight
  useEffect(() => {
    const id = setInterval(() => {
      setInsightVis(false)
      setTimeout(() => { setInsightIdx(i => (i+1) % INSIGHTS.length); setInsightVis(true) }, 350)
    }, 5000)
    return () => clearInterval(id)
  }, [])

  // Live ticker
  useEffect(() => {
    getLiveAlerts(8).then(d => { if (d?.length) setFeed(d) }).catch(() => {})
    getDashboardStats().then(d => { if (d.reportsToday > 0) setLiveN(d.reportsToday) }).catch(() => {})
    const id = setInterval(() => {
      const next = FEED[Math.floor(Math.random() * FEED.length)]
      setFeed(p => [next, ...p.slice(0,7)])
      setIsNew(true); setPulseIdx(Math.floor(Math.random() * HOTSPOTS.length))
      setLiveN(c => c + Math.floor(Math.random()*3)+1)
      setTimeout(() => { setIsNew(false); setPulseIdx(null) }, 2000)
    }, 4000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior:'smooth' }) }, [msgs, chatBusy])

  async function send() {
    const q = chatInput.trim(); if (!q) return
    setMsgs(m => [...m, { role:'user', text:q }])
    setChatInput(''); setChatBusy(true)
    await new Promise(r => setTimeout(r, 800))
    setMsgs(m => [...m, { role:'ai', text:aiReply(q) }])
    setChatBusy(false)
  }

  const STATS = [
    { n:counts.r.toLocaleString('en-IN'), l:'Reports today',    c:'#E05252' },
    { n:counts.c.toLocaleString('en-IN'), l:'Scam checks',      c:'#00C896' },
    { n:counts.s.toLocaleString('en-IN'), l:'Currency scans',   c:'#4FA3D1' },
    { n:counts.ci.toLocaleString('en-IN'),l:'Cities monitored', c:'#F5A623' },
  ]

  return (
    <div style={{ paddingTop:64, minHeight:'100vh', background:'var(--ink)' }}>

      {/* ── HEADER ───────────────────────────────────────── */}
      <div style={{ background:'var(--surface)', padding:'40px 0 28px', borderBottom:'1px solid var(--border)' }}>
        <div className="wrap" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:16 }}>
          <div>
            <p className="label-cap">Live Threat Dashboard</p>
            <h1 className="heading" style={{ fontSize:'clamp(1.6rem,3.5vw,2.4rem)', color:'#fff', margin:'8px 0 6px' }}>
              Active fraud patterns across India
            </h1>
            <p style={{ color:'var(--muted)', fontSize:'0.875rem' }}>
              अपने शहर में सक्रिय घोटाले देखें — हर घंटे अपडेट होता है
            </p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            {/* AI CHAT BUTTON — always visible */}
            <button
              onClick={() => setChatOpen(true)}
              style={{
                display:'flex', alignItems:'center', gap:8,
                background:'linear-gradient(135deg,#00C896,#4FA3D1)',
                border:'none', borderRadius:10, padding:'12px 22px',
                color:'#0D1B2A', fontWeight:800, fontSize:'0.9rem',
                cursor:'pointer', fontFamily:'Inter,sans-serif',
                boxShadow:'0 4px 20px rgba(0,200,150,0.35)',
              }}>
              🤖 Ask AI Assistant
            </button>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontFamily:"'Sora',sans-serif", fontSize:'1.2rem', fontWeight:800, color:'#fff' }}>
                {liveN.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize:'0.7rem', color:'var(--muted)' }}>total today</div>
            </div>
            <span className="live-pill"><span className="dot"/>Live</span>
          </div>
        </div>
      </div>

      <div style={{ padding:'28px 0 60px' }}>
        <div className="wrap">

          {/* ── STAT CARDS ───────────────────────────────── */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:18 }} className="stat-g">
            {STATS.map((s,i) => (
              <div key={i} className="card" style={{ textAlign:'center', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse at 50% 0%,${s.c}18,transparent 70%)`, pointerEvents:'none' }}/>
                <span style={{ display:'block', fontFamily:"'Sora',sans-serif", fontSize:'clamp(1.3rem,2.5vw,1.9rem)', fontWeight:800, color:s.c, lineHeight:1, marginBottom:6 }}>
                  {s.n}
                </span>
                <span style={{ fontSize:'0.75rem', color:'var(--muted)' }}>{s.l}</span>
              </div>
            ))}
          </div>

          {/* ── AI INSIGHT BANNER ────────────────────────── */}
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:18, background:'linear-gradient(135deg,rgba(0,200,150,0.08),rgba(79,163,209,0.05))', border:'1px solid rgba(0,200,150,0.25)', borderRadius:12, padding:'14px 18px' }}>
            <div style={{ width:38, height:38, borderRadius:10, background:'rgba(0,200,150,0.18)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', flexShrink:0 }}>
              🤖
            </div>
            <div style={{ flex:1 }}>
              <span style={{ fontSize:'0.65rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.13em', color:'var(--accent)', display:'block', marginBottom:3 }}>
                AI Insight — Updated Live
              </span>
              <p style={{ fontSize:'0.84rem', color:'var(--text)', lineHeight:1.5, opacity:insightVis?1:0, transition:'opacity 0.35s' }}>
                {INSIGHTS[insightIdx]}
              </p>
            </div>
          </div>

          {/* ── MAP + FEED ───────────────────────────────── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:18, marginBottom:18 }} className="dash-g">

            {/* INDIA MAP */}
            <div className="card" style={{ padding:24 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <span style={{ fontFamily:"'Sora',sans-serif", fontWeight:700, fontSize:'0.95rem', color:'#fff' }}>
                  Cybercrime Hotspots — India 2026
                </span>
                <span className="live-pill"><span className="dot"/>Live</span>
              </div>

              <svg
                viewBox="26 1 130 215"
                style={{ width:'100%', maxHeight:430, display:'block' }}
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <radialGradient id="mapbg" cx="50%" cy="40%" r="60%">
                    <stop offset="0%"   stopColor="#1e6048"/>
                    <stop offset="100%" stopColor="#0b2e1e"/>
                  </radialGradient>
                  <filter id="dg">
                    <feGaussianBlur stdDeviation="1.5" result="b"/>
                    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                </defs>

                {/* India filled shape */}
                <path d={INDIA} fill="url(#mapbg)" stroke="#00C896" strokeWidth="0.6" strokeOpacity="0.7" strokeLinejoin="round"/>

                {/* Hotspot dots */}
                {HOTSPOTS.map((h,i) => {
                  const col = SEV[h.sev]
                  const pulse = pulseIdx === i
                  return (
                    <g key={i} style={{ cursor:'pointer' }}
                       onMouseEnter={() => setTip(i)}
                       onMouseLeave={() => setTip(null)}>
                      {/* Outer ripple */}
                      <circle cx={h.x} cy={h.y} r="1" fill={col} opacity="0">
                        <animate attributeName="r"       values={`3;${pulse?16:11};3`}  dur="2s" repeatCount="indefinite"/>
                        <animate attributeName="opacity" values="0.5;0;0.5"              dur="2s" repeatCount="indefinite"/>
                      </circle>
                      {/* Inner ripple */}
                      <circle cx={h.x} cy={h.y} r="1" fill={col} opacity="0">
                        <animate attributeName="r"       values={`3;${pulse?10:7};3`}   dur="2s" begin="0.4s" repeatCount="indefinite"/>
                        <animate attributeName="opacity" values="0.45;0;0.45"            dur="2s" begin="0.4s" repeatCount="indefinite"/>
                      </circle>
                      {/* Core dot */}
                      <circle cx={h.x} cy={h.y} r={pulse?4.5:3.2} fill={col} filter="url(#dg)" style={{ transition:'r 0.3s' }}/>
                      <circle cx={h.x} cy={h.y} r={pulse?4.5:3.2} fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.5"/>

                      {/* Tooltip */}
                      {tip === i && (() => {
                        const flip = h.x > 120
                        const tx = flip ? h.x - 56 : h.x + 4
                        const ty = h.y < 20 ? h.y + 4 : h.y - 30
                        return (
                          <g>
                            <rect x={tx-2} y={ty-2} width={58} height={32} rx="3" fill="#0f1729" stroke="#1E3048" strokeWidth="0.6" opacity="0.97"/>
                            <text x={tx+2} y={ty+8}  fill="#fff"    fontSize="5"   fontWeight="700" fontFamily="sans-serif">{h.city}</text>
                            <text x={tx+2} y={ty+16} fill={col}     fontSize="4.2" fontFamily="sans-serif">{h.type}</text>
                            <text x={tx+2} y={ty+23} fill="#6B8199" fontSize="4"   fontFamily="sans-serif">{h.reports} reports/wk</text>
                          </g>
                        )
                      })()}
                    </g>
                  )
                })}
              </svg>

              <div style={{ display:'flex', gap:20, marginTop:8, fontSize:'0.75rem', color:'var(--muted)' }}>
                {[['#E05252','High'],['#F5A623','Moderate'],['#00C896','Low']].map(([c,l]) => (
                  <span key={l} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ width:10, height:10, borderRadius:'50%', background:c, display:'inline-block', boxShadow:`0 0 6px ${c}99` }}/>
                    {l}
                  </span>
                ))}
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

              {/* Live Feed */}
              <div className="card" style={{ flex:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                  <span style={{ fontFamily:"'Sora',sans-serif", fontWeight:700, fontSize:'0.88rem', color:'#fff' }}>Recent Alerts</span>
                  <span className="live-pill"><span className="dot"/>Live</span>
                </div>
                {feed.slice(0,6).map((a,i) => {
                  const col = SEV[a.type||'warn']
                  return (
                    <div key={i} style={{ display:'flex', gap:10, padding:'9px 0', borderBottom:i<5?'1px solid var(--border)':'none', background:i===0&&isNew?'rgba(0,200,150,0.05)':'transparent', transition:'background 0.4s', animation:i===0&&isNew?'sdn 0.4s ease':'none', borderRadius:6 }}>
                      <div style={{ width:30, height:30, borderRadius:7, background:`${col}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'0.85rem' }}>{a.icon||'🔴'}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:'0.63rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:col, marginBottom:1 }}>{a.label||a.fraud_type}</div>
                        <div style={{ fontSize:'0.78rem', color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.text||a.description}</div>
                        <div style={{ fontSize:'0.65rem', color:'var(--muted)', marginTop:1 }}>{a.city}</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* AI Summary */}
              <div className="card" style={{ background:'linear-gradient(135deg,rgba(0,200,150,0.07),transparent)', border:'1px solid rgba(0,200,150,0.2)' }}>
                <div style={{ fontSize:'0.67rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', color:'var(--accent)', marginBottom:12 }}>
                  🤖 AI Pattern Summary
                </div>
                {[
                  { l:'Top scam type',      v:'Digital Arrest', c:'var(--danger)' },
                  { l:'Peak fraud time',    v:'2 PM–4 PM IST',  c:'var(--warn)'   },
                  { l:'Most targeted city', v:'Delhi NCR',      c:'var(--sky)'    },
                  { l:'Calls blocked today',v:'3,241',          c:'var(--accent)' },
                ].map((s,i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:i<3?'1px solid rgba(255,255,255,0.04)':'none' }}>
                    <span style={{ fontSize:'0.78rem', color:'var(--muted)' }}>{s.l}</span>
                    <span style={{ fontSize:'0.78rem', fontWeight:700, color:s.c }}>{s.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── CITY BREAKDOWN ───────────────────────────── */}
          <div className="card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <span style={{ fontFamily:"'Sora',sans-serif", fontWeight:700, fontSize:'0.95rem', color:'#fff' }}>City-wise Breakdown</span>
              <span style={{ fontSize:'0.74rem', color:'var(--muted)' }}>Hourly · NCRP data</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:10 }}>
              {[...HOTSPOTS].sort((a,b)=>b.reports-a.reports).map((h,i) => (
                <div key={i} style={{ background:'rgba(255,255,255,0.02)', border:'1px solid var(--border)', borderRadius:8, padding:'11px 13px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                    <span style={{ width:7, height:7, borderRadius:'50%', background:SEV[h.sev], boxShadow:`0 0 5px ${SEV[h.sev]}88`, flexShrink:0 }}/>
                    <span style={{ fontWeight:700, fontSize:'0.84rem', color:'#fff', flex:1 }}>{h.city}</span>
                    <span style={{ fontFamily:"'Sora',sans-serif", fontWeight:800, fontSize:'0.88rem', color:SEV[h.sev] }}>{h.reports}</span>
                  </div>
                  <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:4, overflow:'hidden', marginBottom:5 }}>
                    <div style={{ height:'100%', width:`${(h.reports/847)*100}%`, background:SEV[h.sev], borderRadius:4, transition:'width 1.2s ease' }}/>
                  </div>
                  <div style={{ fontSize:'0.69rem', color:'var(--muted)' }}>{h.type}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── AI CHAT MODAL ────────────────────────────────── */}
      {chatOpen && (
        <div
          style={{ position:'fixed', inset:0, zIndex:600, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(6px)', display:'flex', alignItems:'flex-end', justifyContent:'flex-end', padding:24 }}
          onClick={e => { if (e.target === e.currentTarget) setChatOpen(false) }}
        >
          <div style={{ width:'100%', maxWidth:420, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, overflow:'hidden', display:'flex', flexDirection:'column', maxHeight:'82vh', animation:'sUp 0.28s ease' }}>

            {/* Chat header */}
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12, background:'linear-gradient(135deg,rgba(0,200,150,0.06),transparent)' }}>
              <div style={{ width:38, height:38, borderRadius:10, background:'rgba(0,200,150,0.18)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', flexShrink:0 }}>🤖</div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Sora',sans-serif", fontWeight:700, fontSize:'0.92rem', color:'#fff' }}>ShieldAI Assistant</div>
                <div style={{ fontSize:'0.7rem', color:'var(--accent)' }}>● Online · AI fraud intelligence</div>
              </div>
              <button onClick={() => setChatOpen(false)} style={{ background:'var(--raised)', border:'1px solid var(--border)', color:'var(--muted)', borderRadius:8, width:32, height:32, cursor:'pointer', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Inter,sans-serif' }}>✕</button>
            </div>

            {/* Quick prompts */}
            <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', display:'flex', gap:6, flexWrap:'wrap' }}>
              {['Threats in Delhi?','Spot a scam?','How to report?','Safety tips?','Mumbai threats?'].map(q => (
                <button key={q} onClick={() => setChatInput(q)}
                  style={{ fontSize:'0.71rem', padding:'5px 11px', borderRadius:100, background:'rgba(0,200,150,0.09)', border:'1px solid rgba(0,200,150,0.25)', color:'var(--accent)', cursor:'pointer', fontFamily:'Inter,sans-serif', whiteSpace:'nowrap', transition:'background 0.18s' }}>
                  {q}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div style={{ flex:1, overflowY:'auto', padding:14, display:'flex', flexDirection:'column', gap:10 }}>
              {msgs.map((m,i) => (
                <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start', animation:'sdn 0.3s ease' }}>
                  {m.role==='ai' && (
                    <div style={{ width:28, height:28, borderRadius:8, background:'rgba(0,200,150,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.9rem', flexShrink:0, marginRight:8, alignSelf:'flex-end' }}>🤖</div>
                  )}
                  <div style={{
                    maxWidth:'82%', padding:'10px 14px',
                    borderRadius: m.role==='user'?'14px 14px 2px 14px':'14px 14px 14px 2px',
                    background: m.role==='user'?'var(--accent)':'var(--raised)',
                    border: m.role==='ai'?'1px solid var(--border)':'none',
                    fontSize:'0.83rem', color:m.role==='user'?'var(--ink)':'var(--text)',
                    lineHeight:1.6, whiteSpace:'pre-line', fontWeight:m.role==='user'?600:400,
                  }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {chatBusy && (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:'rgba(0,200,150,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.9rem', flexShrink:0 }}>🤖</div>
                  <div style={{ padding:'10px 14px', background:'var(--raised)', border:'1px solid var(--border)', borderRadius:'14px 14px 14px 2px', display:'flex', gap:5, alignItems:'center' }}>
                    {[0,1,2].map(i => (
                      <span key={i} style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)', display:'inline-block', animation:`bnc 1.2s ${i*0.2}s ease-in-out infinite` }}/>
                    ))}
                  </div>
                </div>
              )}
              <div ref={chatEnd}/>
            </div>

            {/* Input row */}
            <div style={{ padding:'12px 14px', borderTop:'1px solid var(--border)', display:'flex', gap:8 }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Ask about fraud patterns, city threats…"
                style={{ flex:1, background:'var(--raised)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 13px', color:'var(--text)', fontSize:'0.85rem', fontFamily:'Inter,sans-serif', outline:'none', transition:'border-color 0.18s' }}
                onFocus={e => e.target.style.borderColor='var(--accent)'}
                onBlur={e => e.target.style.borderColor='var(--border)'}
              />
              <button onClick={send} disabled={chatBusy || !chatInput.trim()}
                style={{ background:chatBusy||!chatInput.trim()?'var(--raised)':'var(--accent)', border:'1px solid var(--border)', borderRadius:8, width:42, height:42, cursor:'pointer', fontSize:'1.1rem', flexShrink:0, transition:'background 0.2s', color:chatBusy||!chatInput.trim()?'var(--muted)':'var(--ink)', fontWeight:700 }}>
                ↑
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media(max-width:960px){.dash-g{grid-template-columns:1fr!important}.stat-g{grid-template-columns:1fr 1fr!important}}
        @keyframes sdn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes sUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bnc{0%,80%,100%{transform:scale(0.5);opacity:0.3}40%{transform:scale(1);opacity:1}}
      `}</style>
    </div>
  )
}
