import { useState } from 'react';

function FormulaCard({ title, formula, description, variant = 'default' }: {
  title: string;
  formula: string;
  description: string;
  variant?: 'default' | 'warning' | 'success' | 'danger';
}) {
  const variantStyles = {
    default: 'border-slate-700 bg-slate-800/50',
    warning: 'border-amber-500/50 bg-amber-900/20',
    success: 'border-emerald-500/50 bg-emerald-900/20',
    danger: 'border-red-500/50 bg-red-900/20',
  };

  return (
    <div className={`rounded-xl border p-6 ${variantStyles[variant]} backdrop-blur-sm transition-all hover:scale-[1.01]`}>
      <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
      <div className="bg-black/40 rounded-lg p-4 mb-3 font-mono text-sm overflow-x-auto">
        <code className="text-cyan-300 whitespace-pre">{formula}</code>
      </div>
      <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function FileTree({ items, depth = 0 }: { items: FileItem[]; depth?: number }) {
  return (
    <div className={`${depth > 0 ? 'ml-4 border-l border-slate-700 pl-3' : ''}`}>
      {items.map((item, i) => (
        <div key={i}>
          <div className="flex items-center gap-2 py-1 group">
            <span className={`text-sm ${item.type === 'folder' ? 'text-amber-400' : 'text-slate-300'} font-mono`}>
              {item.type === 'folder' ? '📁' : '📄'} {item.name}
            </span>
            {item.description && (
              <span className="text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                — {item.description}
              </span>
            )}
          </div>
          {item.children && <FileTree items={item.children} depth={depth + 1} />}
        </div>
      ))}
    </div>
  );
}

interface FileItem {
  name: string;
  type: 'file' | 'folder';
  description?: string;
  children?: FileItem[];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'formulas' | 'architecture' | 'rules'>('formulas');

  const backendStructure: FileItem[] = [
    {
      name: 'backend/', type: 'folder', description: 'FastAPI application',
      children: [
        { name: 'app/', type: 'folder', children: [
          { name: '__init__.py', type: 'file' },
          { name: 'main.py', type: 'file', description: 'FastAPI app entry, CORS, lifespan' },
          { name: 'config.py', type: 'file', description: 'Settings via pydantic-settings' },
          { name: 'database.py', type: 'file', description: 'SQLAlchemy engine & session' },
          {
            name: 'models/', type: 'folder', description: 'SQLAlchemy ORM models',
            children: [
              { name: 'user.py', type: 'file', description: 'User model (OAuth, roles, soft-delete)' },
              { name: 'calculation.py', type: 'file', description: 'Saved calculations' },
              { name: 'audit_log.py', type: 'file', description: 'Audit trail entries' },
              { name: 'branding.py', type: 'file', description: 'Configurable branding JSON' },
            ]
          },
          {
            name: 'schemas/', type: 'folder', description: 'Pydantic request/response schemas',
            children: [
              { name: 'auth.py', type: 'file' },
              { name: 'calculator.py', type: 'file' },
              { name: 'user.py', type: 'file' },
            ]
          },
          {
            name: 'api/', type: 'folder', description: 'Route handlers',
            children: [
              { name: 'auth.py', type: 'file', description: 'OAuth endpoints (Google/MS)' },
              { name: 'calculator.py', type: 'file', description: 'ML% calc endpoints' },
              { name: 'ocr.py', type: 'file', description: 'Screenshot upload & OCR' },
              { name: 'admin.py', type: 'file', description: 'Admin-only routes' },
              { name: 'users.py', type: 'file', description: 'User management' },
            ]
          },
          {
            name: 'services/', type: 'folder', description: 'Business logic layer',
            children: [
              { name: 'margin_engine.py', type: 'file', description: 'Core formula calculations' },
              { name: 'ocr_engine.py', type: 'file', description: 'EasyOCR/Tesseract wrapper' },
              { name: 'auth_service.py', type: 'file', description: 'JWT, OAuth flows' },
              { name: 'audit_service.py', type: 'file', description: 'Audit logging' },
            ]
          },
          {
            name: 'middleware/', type: 'folder',
            children: [
              { name: 'auth_middleware.py', type: 'file', description: 'Role-based access control' },
              { name: 'rate_limiter.py', type: 'file' },
              { name: 'logging.py', type: 'file' },
            ]
          },
        ]},
        { name: 'alembic/', type: 'folder', description: 'DB migrations' },
        { name: 'tests/', type: 'folder', description: 'Pytest suite' },
        { name: 'requirements.txt', type: 'file' },
        { name: 'Dockerfile', type: 'file' },
      ]
    },
  ];

  const frontendStructure: FileItem[] = [
    {
      name: 'frontend/', type: 'folder', description: 'React + TypeScript + Tailwind',
      children: [
        { name: 'src/', type: 'folder', children: [
          { name: 'App.tsx', type: 'file', description: 'Root component, router' },
          { name: 'main.tsx', type: 'file' },
          {
            name: 'components/', type: 'folder',
            children: [
              { name: 'Calculator/', type: 'folder', description: 'ML% calculator UI', children: [
                { name: 'MarginLevelDisplay.tsx', type: 'file' },
                { name: 'PositionForm.tsx', type: 'file' },
                { name: 'LiquidationGauge.tsx', type: 'file' },
                { name: 'BalanceAdjuster.tsx', type: 'file' },
              ]},
              { name: 'OCR/', type: 'folder', children: [
                { name: 'ScreenshotUploader.tsx', type: 'file' },
                { name: 'OCRResultViewer.tsx', type: 'file' },
              ]},
              { name: 'ui/', type: 'folder', description: 'Shared UI primitives' },
              { name: 'layout/', type: 'folder', description: 'Header, Sidebar, Footer' },
            ]
          },
          {
            name: 'hooks/', type: 'folder',
            children: [
              { name: 'useAuth.ts', type: 'file' },
              { name: 'useCalculator.ts', type: 'file' },
              { name: 'useOCR.ts', type: 'file' },
            ]
          },
          {
            name: 'services/', type: 'folder', description: 'API client layer',
            children: [
              { name: 'api.ts', type: 'file' },
              { name: 'auth.ts', type: 'file' },
            ]
          },
          {
            name: 'store/', type: 'folder', description: 'Zustand/Context state',
            children: [
              { name: 'authStore.ts', type: 'file' },
              { name: 'calcStore.ts', type: 'file' },
            ]
          },
          { name: 'pages/', type: 'folder', description: 'Route pages' },
          { name: 'utils/', type: 'folder', description: 'Formatters, validators' },
          { name: 'types/', type: 'folder', description: 'TypeScript interfaces' },
        ]},
        { name: 'tailwind.config.ts', type: 'file' },
        { name: 'vite.config.ts', type: 'file' },
        { name: 'Dockerfile', type: 'file' },
      ]
    },
  ];

  const infraStructure: FileItem[] = [
    {
      name: 'infra/', type: 'folder', description: 'Deployment & config',
      children: [
        { name: 'docker-compose.yml', type: 'file', description: 'Port 8504, all services' },
        { name: 'nginx/', type: 'folder', children: [
          { name: 'nginx.conf', type: 'file', description: 'Reverse proxy config' },
          { name: 'ssl/', type: 'folder' },
        ]},
        { name: 'cloudflare/', type: 'folder', children: [
          { name: 'tunnel-config.yml', type: 'file', description: 'cloudflared tunnel' },
        ]},
        { name: 'branding/', type: 'folder', children: [
          { name: 'config.json', type: 'file', description: 'Configurable branding (logo, colors, name)' },
        ]},
      ]
    },
  ];

  const rootFiles: FileItem[] = [
    { name: 'README.md', type: 'file' },
    { name: '.env.example', type: 'file' },
    { name: '.gitignore', type: 'file' },
    { name: 'LICENSE', type: 'file' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-lg">
              ML
            </div>
            <div>
              <h1 className="text-xl font-bold">MLCalc</h1>
              <p className="text-xs text-slate-400">Margin Level Calculator — Reference Document</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium border border-emerald-500/30">
              v0.1 — Analysis Phase
            </span>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-6xl mx-auto px-6 pt-8">
        <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1 border border-slate-700/50 w-fit">
          {(['formulas', 'rules', 'architecture'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {tab === 'formulas' && '📐 Derived Formulas'}
              {tab === 'rules' && '⚡ Critical Rules'}
              {tab === 'architecture' && '🏗️ Architecture'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {activeTab === 'formulas' && (
          <div className="space-y-8">
            {/* Intro */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Task 1: Reverse-Engineered Formulas
              </h2>
              <p className="text-slate-300 leading-relaxed mb-4">
                Derived from analysis of 3 MT5 terminal screenshots (Trade tab) in <code className="text-cyan-400 bg-slate-800 px-1.5 py-0.5 rounded">docs/screenshots/</code>. 
                The screenshots show the standard MT5 account status bar: <strong>Balance · Equity · Margin · Free Margin · Margin Level%</strong>, 
                along with open position details including Long/Short P/L.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/30">
                  <div className="text-xs text-slate-500 mb-1">Screenshot 1</div>
                  <div className="text-sm text-slate-300">18:31:40 — Initial state</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/30">
                  <div className="text-xs text-slate-500 mb-1">Screenshot 2</div>
                  <div className="text-sm text-slate-300">18:32:34 — Price moved</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/30">
                  <div className="text-xs text-slate-500 mb-1">Screenshot 3</div>
                  <div className="text-sm text-slate-300">18:32:42 — Further movement</div>
                </div>
              </div>
            </div>

            {/* Formula 1: Margin Level */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-cyan-600/30 flex items-center justify-center text-cyan-400 text-sm font-bold">1</span>
                Margin Level %
              </h3>
              <FormulaCard
                title="Primary Formula"
                formula={`ML% = (Equity / Used_Margin) × 100

Where:
  • Equity    = real-time account value (ticks every price change)
  • Used_Margin = collateral locked for open positions (fixed at entry)`}
                description="The broker's execution engine continuously monitors this value. When ML% drops to the Stop Out threshold (typically 20-50%), forced liquidation begins. When ML% = 100%, Equity exactly equals Used Margin — this is the liquidation boundary."
                variant="default"
              />
              <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-5">
                <h4 className="text-sm font-semibold text-slate-300 mb-2">MT5 Terminal Display (Status Bar)</h4>
                <div className="flex flex-wrap gap-4 text-sm font-mono">
                  <span className="text-slate-400">Balance: <span className="text-white">$10,000.00</span></span>
                  <span className="text-slate-400">Equity: <span className="text-emerald-400">$10,250.00</span></span>
                  <span className="text-slate-400">Margin: <span className="text-amber-400">$1,080.00</span></span>
                  <span className="text-slate-400">Free: <span className="text-white">$9,170.00</span></span>
                  <span className="text-slate-400">Level: <span className="text-cyan-400">949.07%</span></span>
                </div>
              </div>
            </div>

            {/* Formula 2: Equity */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-cyan-600/30 flex items-center justify-center text-cyan-400 text-sm font-bold">2</span>
                Equity (with Credit)
              </h3>
              <FormulaCard
                title="Full Equity Formula"
                formula={`Equity = Balance + Credit + Floating_PL

Where:
  Floating_PL = Σ(PL_long) + Σ(PL_short)

  PL_long_i  = (Current_Price_i − Open_Price_i) × Volume_i × Contract_Size_i × Point_Value_i
  PL_short_i = (Open_Price_i − Current_Price_i) × Volume_i × Contract_Size_i × Point_Value_i

Simplified (account currency = quote currency):
  PL_long  = (Current_Bid − Open_Price) × Lots × 100,000 × (1 / Current_Bid)
  PL_short = (Open_Price − Current_Ask) × Lots × 100,000 × (1 / Current_Ask)`}
                description="Credit represents broker bonuses, deposit bonuses, or non-withdrawable credit that acts as an equity buffer. It increases Equity without changing Balance. When Credit is fully consumed by losses, Equity drops to Balance level."
                variant="success"
              />
              <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-5">
                <h4 className="text-sm font-semibold text-emerald-300 mb-3">Equity Component Breakdown</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Balance</span>
                      <span className="text-white font-mono">$10,000.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">+ Credit</span>
                      <span className="text-amber-400 font-mono">+$500.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">+ Floating PL (Long)</span>
                      <span className="text-emerald-400 font-mono">+$250.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">+ Floating PL (Short)</span>
                      <span className="text-red-400 font-mono">−$100.00</span>
                    </div>
                    <hr className="border-slate-700" />
                    <div className="flex justify-between font-semibold">
                      <span className="text-white">= Equity</span>
                      <span className="text-cyan-400 font-mono">$10,650.00</span>
                    </div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-3 font-mono text-xs text-slate-400">
                    <div>Balance: fixed (only changes on</div>
                    <div>  trade close or deposit/withdrawal)</div>
                    <div>Credit: fixed bonus amount</div>
                    <div>Floating PL: ticks with every</div>
                    <div>  price change (real-time)</div>
                    <div className="mt-2 text-cyan-400">→ Equity is the dynamic numerator</div>
                    <div className="text-cyan-400">  in the ML% formula</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Formula 3: Liquidation Price */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-cyan-600/30 flex items-center justify-center text-cyan-400 text-sm font-bold">3</span>
                Liquidation Price (ML% = 100%)
              </h3>
              <FormulaCard
                title="Derivation"
                formula={`At liquidation: ML% = 100%
  → Equity = Used_Margin
  → Balance + Credit + Floating_PL_liq = Used_Margin
  → Floating_PL_liq = Used_Margin − Balance − Credit

For a SINGLE LONG position:
  (P_liq − P_open) × Volume × Contract_Size × Point_Value = Used_Margin − Balance − Credit
  
  P_liq = P_open + (Used_Margin − Balance − Credit) / (Volume × Contract_Size × Point_Value)

For a SINGLE SHORT position:
  (P_open − P_liq) × Volume × Contract_Size × Point_Value = Used_Margin − Balance − Credit
  
  P_liq = P_open − (Used_Margin − Balance − Credit) / (Volume × Contract_Size × Point_Value)`}
                description="The liquidation price is the market price at which Equity drops to exactly equal Used_Margin. For Long positions, it's below entry; for Short positions, it's above entry. If Used_Margin − Balance − Credit > 0, the account is already underwater (STOPPED OUT)."
                variant="danger"
              />
              <FormulaCard
                title="Multi-Position General Case"
                formula={`For N open positions, solve for P_target such that:

  Balance + Credit + Σᵢ PL_i(P_target) = Used_Margin_total

Where each PL_i is a linear function of P_target:
  PL_long_i(P)  = (P − Open_i) × Lots_i × TickValue_i / TickSize_i
  PL_short_i(P) = (Open_i − P) × Lots_i × TickValue_i / TickSize_i

Rearranging:
  Σᵢ [(±1) × Lots_i × TickValue_i / TickSize_i] × P_liq 
    = Used_Margin − Balance − Credit − Σᵢ [(±1) × Lots_i × TickValue_i / TickSize_i × (−Open_i)]
    
  P_liq = (Used_Margin − Balance − Credit + Σᵢ[dir_i × Lots_i × TV_i/TS_i × Open_i]) 
          / Σᵢ[dir_i × Lots_i × TV_i/TS_i]

  where dir_i = +1 for Long, −1 for Short`}
                description="For multiple positions on the same symbol, sum all directional sensitivities. For cross-symbol baskets, each position's P/L must be converted to account currency first."
                variant="default"
              />
            </div>

            {/* Formula 4: Required Balance */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-cyan-600/30 flex items-center justify-center text-cyan-400 text-sm font-bold">4</span>
                Required Balance at Target Price (ML% = 100%)
              </h3>
              <FormulaCard
                title="Balance Adjustment Formula"
                formula={`Given a target price P_target, find the minimum Balance needed:

  At ML% = 100%:  Balance_req + Credit + PL(P_target) = Used_Margin
  
  Balance_required = Used_Margin − Credit − Floating_PL(P_target)

For a SINGLE LONG at target price:
  PL(P_target) = (P_target − P_open) × Volume × Contract_Size × Point_Value
  
  Balance_req = Used_Margin − Credit − (P_target − P_open) × Volume × Contract_Size × Point_Value

For a SINGLE SHORT at target price:
  PL(P_target) = (P_open − P_target) × Volume × Contract_Size × Point_Value
  
  Balance_req = Used_Margin − Credit − (P_open − P_target) × Volume × Contract_Size × Point_Value

Additional deposit needed:
  ΔBalance = max(0, Balance_required − Current_Balance)`}
                description="This tells the trader exactly how much they need to deposit to survive until a specific adverse price level. If ΔBalance = 0, the current balance is sufficient."
                variant="warning"
              />
            </div>

            {/* Visual Summary */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8">
              <h3 className="text-lg font-semibold text-white mb-6">Formula Relationship Diagram</h3>
              <div className="font-mono text-sm text-slate-300 bg-black/40 rounded-xl p-6 overflow-x-auto">
                <pre className="whitespace-pre">{`
┌─────────────────────────────────────────────────────────────────────┐
│                        MARGIN LEVEL SYSTEM                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Balance ──────┐                                                   │
│                 │                                                   │
│   Credit ───────┼──→ Equity ──→ ML% = (Equity / Margin) × 100     │
│                 │       │                    │                       │
│   Floating PL ──┘       │                    │                       │
│   (Long + Short)        │              ┌─────┴──────┐               │
│                         │              │            │               │
│                         │         ML% = 100%   ML% < StopOut%      │
│                         │              │            │               │
│                         │         LIQUIDATION   FORCE CLOSE         │
│                         │         PRICE calc    (largest loss       │
│                         │                        first)             │
│                         │                                           │
│   Used_Margin ──────────┘                                           │
│   (fixed at entry)                                                  │
│                                                                     │
│   REVERSE CALCULATIONS:                                             │
│   ┌──────────────────────────────────────────────────────┐          │
│   │ P_liq    = f(Balance, Credit, Margin, Positions)     │          │
│   │ Bal_req  = f(Margin, Credit, P_target, Positions)    │          │
│   └──────────────────────────────────────────────────────┘          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
`}</pre>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-8">
            <div className="bg-red-900/20 border border-red-500/40 rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 text-red-400 flex items-center gap-3">
                <span className="text-3xl">⚠️</span> Critical Rule: STOPPED OUT
              </h2>
              <div className="bg-black/40 rounded-xl p-6 mb-6 font-mono text-sm">
                <code className="text-red-300">
{`IF Balance == Equity:
    STATE = "STOPPED OUT"
    → Do NOT calculate Liquidation Price
    → Do NOT calculate Required Balance
    → Display immediate alert
    → Reason: All credit consumed, no floating P/L buffer
              Account has been force-liquidated by broker`}
                </code>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-700/30">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">Why This Rule Exists</h4>
                  <ul className="space-y-2 text-sm text-slate-400">
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">•</span>
                      <span>When Balance == Equity, it means: Credit + Floating_PL = 0</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">•</span>
                      <span>The credit buffer has been fully consumed by losses</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">•</span>
                      <span>All positions have been closed (no floating P/L)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">•</span>
                      <span>The broker's stop-out engine already liquidated the account</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">•</span>
                      <span>Further calculation is meaningless — the account is dead</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-700/30">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">Detection Logic</h4>
                  <div className="font-mono text-xs text-slate-400 space-y-1">
                    <div className="text-slate-300">// From OCR or manual input:</div>
                    <div>balance = ocr_read("Balance")</div>
                    <div>equity = ocr_read("Equity")</div>
                    <div className="mt-2 text-slate-300">// Critical check:</div>
                    <div className="text-amber-400">if abs(balance - equity) {'<'} epsilon:</div>
                    <div className="text-red-400 ml-4">return STOPPED_OUT_STATE</div>
                    <div className="mt-2 text-slate-300">// Also check:</div>
                    <div className="text-amber-400">if equity {'<='} 0:</div>
                    <div className="text-red-400 ml-4">return STOPPED_OUT_STATE</div>
                    <div className="mt-2 text-slate-300">// Or if ML% already at/below stop-out:</div>
                    <div className="text-amber-400">if ml_percent {'<='} stop_out_threshold:</div>
                    <div className="text-red-400 ml-4">return STOPPED_OUT_STATE</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Rules */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8">
              <h3 className="text-lg font-semibold text-white mb-6">Additional Business Rules</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-700/30">
                  <h4 className="text-sm font-semibold text-amber-400 mb-2">R1: No Positions Open</h4>
                  <p className="text-xs text-slate-400">If Used_Margin = 0, ML% is undefined (display "—"). No liquidation calculation needed.</p>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-700/30">
                  <h4 className="text-sm font-semibold text-amber-400 mb-2">R2: Negative Equity</h4>
                  <p className="text-xs text-slate-400">If Equity {'<'} 0, account is in negative balance. STOPPED OUT + debt to broker (if no NBP).</p>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-700/30">
                  <h4 className="text-sm font-semibold text-amber-400 mb-2">R3: Credit Exhaustion</h4>
                  <p className="text-xs text-slate-400">If Credit {'>'} 0 but Floating_PL {'<'} −Credit, credit is fully consumed. Balance is now at risk.</p>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-700/30">
                  <h4 className="text-sm font-semibold text-amber-400 mb-2">R4: Multi-Directional</h4>
                  <p className="text-xs text-slate-400">Long and Short positions on same symbol may partially offset. Net exposure determines margin.</p>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-700/30">
                  <h4 className="text-sm font-semibold text-amber-400 mb-2">R5: Cross-Currency</h4>
                  <p className="text-xs text-slate-400">P/L in non-deposit currency must be converted at current rate before summing into Equity.</p>
                </div>
                <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-700/30">
                  <h4 className="text-sm font-semibold text-amber-400 mb-2">R6: Swap & Commission</h4>
                  <p className="text-xs text-slate-400">Overnight swap and commissions are included in Floating PL in MT5. Factor into Equity.</p>
                </div>
              </div>
            </div>

            {/* Validation Matrix */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8">
              <h3 className="text-lg font-semibold text-white mb-6">State Machine</h3>
              <div className="font-mono text-xs bg-black/40 rounded-xl p-6 overflow-x-auto">
                <pre className="whitespace-pre text-slate-300">{`
                    ┌──────────────┐
                    │   INPUT      │
                    │ (OCR/Manual) │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ Balance ==   │──── YES ──→ ┌─────────────────┐
                    │ Equity ?     │             │  STOPPED OUT    │
                    └──────┬───────┘             │  (terminal state)│
                           │ NO                  └─────────────────┘
                    ┌──────▼───────┐
                    │ Any open     │──── NO ───→ ┌─────────────────┐
                    │ positions ?  │             │  ML% = N/A      │
                    └──────┬───────┘             │  (idle state)   │
                           │ YES                 └─────────────────┘
                    ┌──────▼───────┐
                    │ Calculate    │
                    │ Equity, ML%  │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ ML% <=       │──── YES ──→ ┌─────────────────┐
                    │ StopOut% ?   │             │  STOPPED OUT    │
                    └──────┬───────┘             │  (imminent)     │
                           │ NO                  └─────────────────┘
                    ┌──────▼───────┐
                    │ Compute      │
                    │ P_liq, Bal_  │
                    │ required     │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   DISPLAY    │
                    │  Results     │
                    └──────────────┘
`}</pre>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'architecture' && (
          <div className="space-y-8">
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Task 2: Proposed Architecture
              </h2>
              <p className="text-slate-300 leading-relaxed mb-6">
                Production-ready full-stack application with OCR-based screenshot analysis, 
                role-based access, and configurable branding.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-2">⚛️</div>
                  <div className="text-sm font-semibold text-blue-300">Frontend</div>
                  <div className="text-xs text-slate-400 mt-1">React + TS + Tailwind</div>
                </div>
                <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-2">🐍</div>
                  <div className="text-sm font-semibold text-emerald-300">Backend</div>
                  <div className="text-xs text-slate-400 mt-1">FastAPI + SQLAlchemy</div>
                </div>
                <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-2">🐘</div>
                  <div className="text-sm font-semibold text-amber-300">Database</div>
                  <div className="text-xs text-slate-400 mt-1">PostgreSQL + Alembic</div>
                </div>
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-2">🐳</div>
                  <div className="text-sm font-semibold text-purple-300">Deploy</div>
                  <div className="text-xs text-slate-400 mt-1">Docker + CF Tunnel</div>
                </div>
              </div>
            </div>

            {/* File Structure */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8">
              <h3 className="text-lg font-semibold text-white mb-6">📂 Complete File Structure</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    Backend (Python FastAPI)
                  </h4>
                  <div className="bg-black/40 rounded-xl p-4 font-mono text-xs overflow-x-auto max-h-[500px] overflow-y-auto">
                    <FileTree items={backendStructure} />
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    Frontend (React + TypeScript)
                  </h4>
                  <div className="bg-black/40 rounded-xl p-4 font-mono text-xs overflow-x-auto max-h-[500px] overflow-y-auto">
                    <FileTree items={frontendStructure} />
                  </div>
                </div>
              </div>
              <div className="mt-8">
                <h4 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  Infrastructure & Root
                </h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-black/40 rounded-xl p-4 font-mono text-xs">
                    <FileTree items={infraStructure} />
                  </div>
                  <div className="bg-black/40 rounded-xl p-4 font-mono text-xs">
                    <FileTree items={rootFiles} />
                  </div>
                </div>
              </div>
            </div>

            {/* Tech Stack Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
                <h3 className="text-base font-semibold text-white mb-4">🔐 Authentication & Authorization</h3>
                <div className="space-y-3 text-sm text-slate-400">
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    <span><strong className="text-slate-200">Google OAuth 2.0</strong> — via <code className="text-cyan-400">authlib</code> or <code className="text-cyan-400">google-auth</code></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    <span><strong className="text-slate-200">Microsoft OAuth</strong> — via MSAL / Azure AD v2.0 endpoint</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    <span><strong className="text-slate-200">JWT tokens</strong> — access + refresh, httpOnly cookies</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    <span><strong className="text-slate-200">Roles:</strong> Visitor (read-only calc) → User (save/history) → Admin (full control)</span>
                  </div>
                </div>
              </div>
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
                <h3 className="text-base font-semibold text-white mb-4">🔍 OCR Engine</h3>
                <div className="space-y-3 text-sm text-slate-400">
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    <span><strong className="text-slate-200">EasyOCR</strong> — primary engine (GPU-accelerated, multilingual)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    <span><strong className="text-slate-200">Pytesseract</strong> — fallback for numeric-only regions</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    <span><strong className="text-slate-200">Preprocessing:</strong> OpenCV (grayscale, threshold, deskew)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    <span><strong className="text-slate-200">Target fields:</strong> Balance, Equity, Margin, Free Margin, ML%, positions</span>
                  </div>
                </div>
              </div>
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
                <h3 className="text-base font-semibold text-white mb-4">🗄️ Database Design</h3>
                <div className="space-y-3 text-sm text-slate-400">
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    <span><strong className="text-slate-200">Users:</strong> id, email, name, provider, role, is_deleted, created_at</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    <span><strong className="text-slate-200">Calculations:</strong> id, user_id, inputs_json, outputs_json, created_at</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    <span><strong className="text-slate-200">Audit Logs:</strong> id, user_id, action, details, ip, timestamp</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    <span><strong className="text-slate-200">Soft deletes:</strong> <code className="text-cyan-400">deleted_at</code> timestamp + SQLAlchemy filter</span>
                  </div>
                </div>
              </div>
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
                <h3 className="text-base font-semibold text-white mb-4">🚀 Deployment</h3>
                <div className="space-y-3 text-sm text-slate-400">
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    <span><strong className="text-slate-200">Docker Compose:</strong> frontend, backend, postgres, nginx</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    <span><strong className="text-slate-200">Port 8504:</strong> exposed via cloudflared tunnel</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    <span><strong className="text-slate-200">Nginx:</strong> reverse proxy, SSL termination, static files</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    <span><strong className="text-slate-200">Branding:</strong> <code className="text-cyan-400">branding/config.json</code> → logo, colors, name, favicon</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Docker Compose Preview */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8">
              <h3 className="text-lg font-semibold text-white mb-4">🐳 docker-compose.yml (Preview)</h3>
              <div className="bg-black/40 rounded-xl p-5 font-mono text-xs overflow-x-auto">
                <pre className="whitespace-pre text-slate-300">{`version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: mlcalc
      POSTGRES_USER: \${DB_USER}
      POSTGRES_PASSWORD: \${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${DB_USER}"]

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql+asyncpg://\${DB_USER}:\${DB_PASSWORD}@postgres/mlcalc
      GOOGLE_CLIENT_ID: \${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: \${GOOGLE_CLIENT_SECRET}
      MS_CLIENT_ID: \${MS_CLIENT_ID}
      MS_CLIENT_SECRET: \${MS_CLIENT_SECRET}
      JWT_SECRET: \${JWT_SECRET}
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build: ./frontend
    environment:
      VITE_API_URL: /api

  nginx:
    image: nginx:alpine
    ports:
      - "8504:8504"
    volumes:
      - ./infra/nginx/nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - backend
      - frontend

  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel --config /etc/cloudflared/config.yml run
    volumes:
      - ./infra/cloudflare/tunnel-config.yml:/etc/cloudflared/config.yml
    depends_on:
      - nginx

volumes:
  pgdata:`}</pre>
              </div>
            </div>

            {/* Branding Config */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8">
              <h3 className="text-lg font-semibold text-white mb-4">🎨 Configurable Branding (config.json)</h3>
              <div className="bg-black/40 rounded-xl p-5 font-mono text-xs overflow-x-auto">
                <pre className="whitespace-pre text-slate-300">{`{
  "app_name": "MLCalc",
  "tagline": "Margin Level Calculator",
  "logo": {
    "light": "/branding/logo-light.svg",
    "dark": "/branding/logo-dark.svg"
  },
  "colors": {
    "primary": "#06b6d4",
    "secondary": "#3b82f6",
    "accent": "#f59e0b",
    "danger": "#ef4444",
    "success": "#10b981"
  },
  "features": {
    "ocr_enabled": true,
    "auth_required_for_save": true,
    "visitor_calc_limit": 10,
    "show_audit_log": false
  },
  "broker_defaults": {
    "stop_out_percent": 50,
    "margin_call_percent": 100,
    "default_leverage": 100
  }
}`}</pre>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            MLCalc Reference Document — Awaiting agreement before full implementation
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>Source: <code className="text-slate-400">bhadip/mlcalc</code></span>
            <span>•</span>
            <span>Screenshots: 3 × MT5 Trade Tab</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
