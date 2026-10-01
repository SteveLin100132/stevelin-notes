import { useState, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import { clsx } from "clsx";
import Term from "./ui/Term";
import ModuleBadge from "./ui/ModuleBadge";
import KindBadge, { KIND_META as KIND_BASE, type Kind } from "./ui/KindBadge";

// 注意：筆記頁面的 .nc-prose 會覆寫 p / ul / li / h* 的字級與間距，
// 所以本元件的文字一律用 div / span，不用那些元素。


type Station = {
  id: string;
  name: string;
  kind: Kind;
  what: ReactNode;
  uses: string[];
  output: string;
  modules: string[]; // 第三層模組代號，名稱與階段由 ModuleBadge 查 ui/modules.ts
};

// 模組代號與階段：refs/PL3_W1_八大模組細化工作項目表_20260923_v14、第三層模組三階段研發分配表_20260923_v5
const STATIONS: Station[] = [
  {
    id: "hr",
    name: "人事",
    kind: "base",
    what: (
      <>建立員工資料：身份、到職日、薪資條件、<Term k="勞保" />、<Term k="健保" />與<Term k="勞退" />。後面每一站都會讀這份資料。</>
    ),
    uses: ["到職文件", "任用條件"],
    output: "人員與任職資料",
    modules: ["1.2.1", "1.3.1", "1.3.2"],
  },
  {
    id: "schedule",
    name: "排班",
    kind: "planned",
    what: (
      <>事先排定每個人哪天上班、幾點到幾點，也標出<Term k="例假" />、<Term k="休息日" />。這只是「預定」，實際有沒有來要看打卡。</>
    ),
    uses: ["人員與任職資料", "工作日曆"],
    output: "班表與預定工時",
    modules: ["2.1.1", "2.3.3"],
  },
  {
    id: "punch",
    name: "打卡",
    kind: "actual",
    what: (
      <>記錄實際進出時間，形成<Term k="出勤紀錄" />。原始紀錄不能改，打錯或漏打要另外申請<Term k="補登" />。</>
    ),
    uses: ["人員資料"],
    output: "原始出勤紀錄",
    modules: ["3.2.1", "3.5.1"],
  },
  {
    id: "leave",
    name: "請假",
    kind: "actual",
    what: (
      <>員工申請請假，主管核准。和打卡並列，都是<Term k="實際事實" />，核准後才算數。</>
    ),
    uses: ["人員資料", "班表", "假別餘額"],
    output: "核准的假單",
    modules: ["4.3.1", "4.4.1", "4.5.2"],
  },
  {
    id: "confirm",
    name: "工時確認",
    kind: "confirmed",
    what: (
      <>把班表、打卡、假單放在一起比對，確認每一段是正常工時、加班還是請假。過了這道閘門，資料才成為<Term k="確認後結果" />，能拿去算錢。</>
    ),
    uses: ["班表", "出勤紀錄", "假單"],
    output: "確認工時",
    modules: ["3.3.1", "3.5.3"],
  },
  {
    id: "payroll",
    name: "計薪",
    kind: "confirmed",
    what: (
      <>算出<Term k="應發" />與<Term k="應扣" />，相減就是<Term k="實發" />。</>
    ),
    uses: ["薪資條件", "確認工時", "假單結果", "勞健保資料"],
    output: "薪資明細與薪資單",
    modules: ["5.3.1", "5.3.2", "5.4.2"],
  },
  {
    id: "tax",
    name: "稅務",
    kind: "confirmed",
    what: (
      <>公司是<Term k="扣繳義務人" />：發薪時先<Term k="預扣" />所得稅繳給國稅局，隔年年初開<Term k="扣繳憑單" />給員工報稅。</>
    ),
    uses: ["薪資明細", "納稅身分"],
    output: "預扣稅額與扣繳資料",
    modules: ["6.3.1", "6.5.1"],
  },
];

const GATE_BEFORE = 4; // 確認閘門位於第 4 站（請假）與第 5 站（工時確認）之間

const KIND_HINT: Record<Kind, string> = {
  base: "員工是誰",
  planned: "打算這樣做",
  actual: "真的發生，可能有錯漏",
  confirmed: "核對過，才能算錢",
};
const KIND_META = KIND_BASE;

// ---------- 插圖 ----------

const C = {
  navy: "var(--blue-700)",
  blue: "var(--blue-500)",
  blue300: "var(--blue-300)",
  blue200: "var(--blue-200)",
  blue100: "var(--blue-100)",
  blue50: "var(--blue-50)",
  orange: "var(--orange-400)",
  orangeDeep: "var(--orange-500)",
  orange100: "var(--orange-100)",
  orange50: "var(--orange-50)",
  n200: "var(--neutral-200)",
  n300: "var(--neutral-300)",
  n400: "var(--neutral-400)",
  n500: "var(--neutral-500)",
  paper: "#ffffff",
};

type SceneProps = { reduce: boolean };

const ease = { duration: 0.4, ease: "easeOut" } as const;
const t = (reduce: boolean, delay = 0) => (reduce ? { duration: 0 } : { ...ease, delay });
const grow = { transformBox: "fill-box", transformOrigin: "left center" } as const;
const growUp = { transformBox: "fill-box", transformOrigin: "center bottom" } as const;

function Backdrop({ tint }: { tint: string }) {
  return (
    <g>
      <ellipse cx="160" cy="200" rx="130" ry="10" fill={C.n200} opacity="0.6" />
      <circle cx="160" cy="112" r="92" fill={tint} />
      <circle cx="62" cy="48" r="5" fill={C.orange} opacity="0.5" />
      <circle cx="268" cy="70" r="3.5" fill={C.blue300} />
      <circle cx="252" cy="172" r="4" fill={C.blue200} />
    </g>
  );
}

function SceneHR({ reduce }: SceneProps) {
  const fields = [
    { y: 104, label: "身份", w: 58 },
    { y: 126, label: "到職日", w: 44 },
    { y: 148, label: "薪資條件", w: 66 },
  ];
  return (
    <g>
      <Backdrop tint={C.blue50} />
      <rect x="62" y="52" width="196" height="132" rx="14" fill={C.paper} stroke={C.navy} strokeWidth="2.5" />
      <path d="M62 66 a14 14 0 0 1 14 -14 h168 a14 14 0 0 1 14 14 v14 h-196 z" fill={C.navy} />
      <text x="80" y="71" fontSize="12" fontWeight="700" fill={C.paper}>員工資料卡</text>
      <circle cx="238" cy="66" r="4" fill={C.orange} />
      {/* 大頭照 */}
      <circle cx="104" cy="128" r="26" fill={C.blue100} />
      <circle cx="104" cy="120" r="9" fill={C.navy} />
      <path d="M86 146 a18 15 0 0 1 36 0 z" fill={C.navy} />
      {/* 欄位 */}
      {fields.map((f, i) => (
        <g key={f.label}>
          <text x="144" y={f.y - 4} fontSize="9" fill={C.n500}>{f.label}</text>
          <rect x="144" y={f.y} width="96" height="6" rx="3" fill={C.n200} />
          <motion.rect
            x="144" y={f.y} height="6" rx="3" width={f.w} fill={C.blue}
            style={grow}
            initial={{ scaleX: reduce ? 1 : 0 }}
            animate={{ scaleX: 1 }}
            transition={t(reduce, 0.15 + i * 0.12)}
          />
        </g>
      ))}
      {/* 勞健保盾牌 */}
      <motion.g
        style={{ transformBox: "view-box", transformOrigin: "240px 170px" }}
        initial={{ scale: reduce ? 1 : 0.4, opacity: reduce ? 1 : 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={t(reduce, 0.55)}
      >
        <path d="M240 150 l20 7 v13 c0 12 -9 19 -20 23 c-11 -4 -20 -11 -20 -23 v-13 z" fill={C.orange} stroke={C.paper} strokeWidth="2.5" />
        <path d="M231 172 l6 6 l12 -13" fill="none" stroke={C.paper} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </motion.g>
    </g>
  );
}

function SceneSchedule({ reduce }: SceneProps) {
  const days = ["一", "二", "三", "四", "五", "六", "日"];
  const x0 = 58;
  const col = 29.5;
  return (
    <g>
      <Backdrop tint={C.blue50} />
      <rect x="48" y="44" width="224" height="148" rx="14" fill={C.paper} stroke={C.navy} strokeWidth="2.5" />
      <path d="M48 58 a14 14 0 0 1 14 -14 h196 a14 14 0 0 1 14 14 v12 h-224 z" fill={C.navy} />
      <rect x="92" y="36" width="6" height="16" rx="3" fill={C.orange} />
      <rect x="222" y="36" width="6" height="16" rx="3" fill={C.orange} />
      <text x="160" y="64" fontSize="11" fontWeight="700" fill={C.paper} textAnchor="middle">本週班表</text>
      {days.map((d, i) => {
        const cx = x0 + i * col + col / 2;
        const off = i >= 5;
        return (
          <g key={d}>
            <text x={cx} y="88" fontSize="10" fill={off ? C.n400 : C.navy} textAnchor="middle" fontWeight="600">{d}</text>
            {off ? (
              <g>
                <circle cx={cx} cy="138" r="11" fill={i === 5 ? C.n200 : C.orange100} />
                <text x={cx} y="142" fontSize="10" fill={i === 5 ? C.n500 : C.orangeDeep} textAnchor="middle" fontWeight="700">
                  {i === 5 ? "休" : "例"}
                </text>
              </g>
            ) : (
              <motion.g
                style={growUp}
                initial={{ scaleY: reduce ? 1 : 0 }}
                animate={{ scaleY: 1 }}
                transition={t(reduce, 0.1 + i * 0.08)}
              >
                <rect x={cx - 10} y="98" width="20" height="76" rx="6" fill={C.blue100} stroke={C.blue} strokeWidth="1.5" strokeDasharray="4 3" />
                <text x={cx} y="110" fontSize="8" fill={C.blue} textAnchor="middle">09</text>
                <text x={cx} y="170" fontSize="8" fill={C.blue} textAnchor="middle">18</text>
              </motion.g>
            )}
          </g>
        );
      })}
    </g>
  );
}

function ScenePunch({ reduce }: SceneProps) {
  const ticks = Array.from({ length: 12 }, (_, i) => i);
  return (
    <g>
      <Backdrop tint={C.orange50} />
      {/* 時鐘 */}
      <circle cx="112" cy="114" r="58" fill={C.paper} stroke={C.navy} strokeWidth="3" />
      <circle cx="112" cy="114" r="50" fill="none" stroke={C.blue100} strokeWidth="6" />
      {ticks.map((i) => {
        const a = (i * Math.PI) / 6;
        const r1 = i % 3 === 0 ? 38 : 42;
        return (
          <line
            key={i}
            x1={112 + Math.sin(a) * r1} y1={114 - Math.cos(a) * r1}
            x2={112 + Math.sin(a) * 46} y2={114 - Math.cos(a) * 46}
            stroke={C.navy} strokeWidth={i % 3 === 0 ? 2.5 : 1.2} strokeLinecap="round"
          />
        );
      })}
      {/* 時針約 8:52 */}
      <line x1="112" y1="114" x2="112" y2="88" stroke={C.navy} strokeWidth="4" strokeLinecap="round" transform="rotate(266 112 114)" />
      <motion.line
        x1="112" y1="114" x2="112" y2="76" stroke={C.orange} strokeWidth="2.5" strokeLinecap="round"
        style={{ transformOrigin: "112px 114px" }}
        initial={{ rotate: reduce ? 312 : 200 }}
        animate={{ rotate: 312 }}
        transition={reduce ? { duration: 0 } : { duration: 0.9, ease: "easeOut" }}
      />
      <circle cx="112" cy="114" r="4" fill={C.orange} />
      {/* 出勤紀錄卡 */}
      <motion.g
        initial={{ x: reduce ? 0 : 30, opacity: reduce ? 1 : 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={t(reduce, 0.25)}
      >
        <rect x="186" y="62" width="90" height="118" rx="10" fill={C.paper} stroke={C.orange} strokeWidth="2.5" />
        <text x="231" y="84" fontSize="10.5" fontWeight="700" fill={C.orangeDeep} textAnchor="middle">出勤紀錄</text>
        <line x1="196" y1="92" x2="266" y2="92" stroke={C.orange100} strokeWidth="2" />
        <text x="198" y="112" fontSize="9" fill={C.n500}>上班</text>
        <text x="266" y="112" fontSize="11" fontWeight="700" fill={C.navy} textAnchor="end" fontFamily="var(--font-mono)">08:52</text>
        <text x="198" y="136" fontSize="9" fill={C.n500}>下班</text>
        <text x="266" y="136" fontSize="11" fontWeight="700" fill={C.navy} textAnchor="end" fontFamily="var(--font-mono)">19:40</text>
        <rect x="198" y="150" width="66" height="18" rx="9" fill={C.orange50} />
        <text x="231" y="162" fontSize="8.5" fill={C.orangeDeep} textAnchor="middle">原始紀錄不可改</text>
      </motion.g>
    </g>
  );
}

function SceneLeave({ reduce }: SceneProps) {
  const rows = [
    { y: 100, k: "假別", v: "病假" },
    { y: 124, k: "日期", v: "10/14" },
    { y: 148, k: "時數", v: "8 小時" },
  ];
  return (
    <g>
      <Backdrop tint={C.orange50} />
      <rect x="86" y="50" width="150" height="150" rx="10" fill={C.paper} stroke={C.n300} strokeWidth="1.5" transform="rotate(-5 160 125)" />
      <rect x="84" y="42" width="150" height="152" rx="10" fill={C.paper} stroke={C.navy} strokeWidth="2.5" />
      <text x="159" y="68" fontSize="13" fontWeight="700" fill={C.navy} textAnchor="middle">請假單</text>
      <line x1="100" y1="78" x2="218" y2="78" stroke={C.blue100} strokeWidth="2" />
      {rows.map((r) => (
        <g key={r.k}>
          <text x="102" y={r.y} fontSize="9.5" fill={C.n500}>{r.k}</text>
          <text x="136" y={r.y} fontSize="11" fontWeight="600" fill={C.navy}>{r.v}</text>
          <line x1="134" y1={r.y + 6} x2="216" y2={r.y + 6} stroke={C.n200} strokeWidth="1.2" />
        </g>
      ))}
      <text x="102" y="178" fontSize="9" fill={C.n400}>主管簽核</text>
      {/* 核准章 */}
      <g transform="rotate(-14 208 168)">
        <motion.g
          style={{ transformBox: "view-box", transformOrigin: "208px 168px" }}
          initial={{ scale: reduce ? 1 : 1.8, opacity: reduce ? 1 : 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={reduce ? { duration: 0 } : { duration: 0.35, delay: 0.35, ease: [0.3, 1.4, 0.5, 1] }}
        >
          <circle cx="208" cy="168" r="27" fill={C.orange50} stroke={C.orangeDeep} strokeWidth="3" />
          <circle cx="208" cy="168" r="21" fill="none" stroke={C.orangeDeep} strokeWidth="1" />
          <text x="208" y="173" fontSize="14" fontWeight="800" fill={C.orangeDeep} textAnchor="middle">核准</text>
        </motion.g>
      </g>
    </g>
  );
}

function SceneConfirm({ reduce }: SceneProps) {
  // 橫軸：08:00 → 20:00，標籤欄在左側
  const X = (h: number) => 78 + (h - 8) * 17;
  const rows = [
    { y: 64, label: "班表", color: C.blue },
    { y: 102, label: "打卡", color: C.orangeDeep },
    { y: 140, label: "確認", color: C.navy },
  ];
  const bar = 12;
  return (
    <g>
      <Backdrop tint={C.blue50} />
      <rect x="24" y="36" width="272" height="170" rx="14" fill={C.paper} stroke={C.navy} strokeWidth="2.5" />
      {/* 刻度 */}
      {[8, 12, 18, 20].map((h) => (
        <g key={h}>
          <line x1={X(h)} y1="54" x2={X(h)} y2="160" stroke={C.n200} strokeDasharray="2 3" />
          <text x={X(h)} y="192" fontSize="8" fill={C.n400} textAnchor="middle">{`${String(h).padStart(2, "0")}:00`}</text>
        </g>
      ))}
      {rows.map((r) => (
        <text key={r.label} x="38" y={r.y + 10} fontSize="10" fontWeight="700" fill={r.color}>{r.label}</text>
      ))}
      {/* 班表：09–12、13–18（虛線＝預定） */}
      {[[9, 12], [13, 18]].map(([a, b]) => (
        <rect key={a} x={X(a)} y={rows[0].y} width={X(b) - X(a)} height={bar} rx="4" fill={C.blue100} stroke={C.blue} strokeWidth="1.5" strokeDasharray="4 3" />
      ))}
      {/* 打卡：08:52–19:40 */}
      <motion.rect
        x={X(8 + 52 / 60)} y={rows[1].y} width={X(19 + 40 / 60) - X(8 + 52 / 60)} height={bar} rx="4" fill={C.orange}
        style={grow}
        initial={{ scaleX: reduce ? 1 : 0 }}
        animate={{ scaleX: 1 }}
        transition={t(reduce, 0.1)}
      />
      {/* 確認：正常 09–12、13–18；加班 18–19:30 */}
      {[
        { a: 9, b: 12, fill: C.navy, d: 0.35 },
        { a: 13, b: 18, fill: C.navy, d: 0.5 },
        { a: 18, b: 19.5, fill: C.orangeDeep, d: 0.7 },
      ].map((s) => (
        <motion.rect
          key={s.a}
          x={X(s.a)} y={rows[2].y} width={X(s.b) - X(s.a)} height={bar} rx="4" fill={s.fill}
          style={grow}
          initial={{ scaleX: reduce ? 1 : 0 }}
          animate={{ scaleX: 1 }}
          transition={t(reduce, s.d)}
        />
      ))}
      <text x={X(15.5)} y="170" fontSize="9" fill={C.navy} textAnchor="middle">正常 8 小時</text>
      <text x={X(18.75)} y="170" fontSize="9" fontWeight="700" fill={C.orangeDeep} textAnchor="middle">加班 1.5</text>
      {/* 放大鏡：聚焦下班後那一段 */}
      <motion.g
        initial={{ x: reduce ? 0 : -40, opacity: reduce ? 1 : 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={t(reduce, 0.85)}
      >
        <circle cx={X(19.2)} cy="122" r="30" fill={C.orange} fillOpacity="0.08" stroke={C.navy} strokeWidth="3" />
        <line x1={X(19.2) + 21} y1="144" x2={X(19.2) + 32} y2="158" stroke={C.navy} strokeWidth="5" strokeLinecap="round" />
      </motion.g>
    </g>
  );
}

function ScenePayroll({ reduce }: SceneProps) {
  const lines = [
    { y: 94, k: "應發", w: 74, fill: C.navy, sign: "+" },
    { y: 120, k: "應扣", w: 26, fill: C.orange, sign: "−" },
  ];
  return (
    <g>
      <Backdrop tint={C.blue50} />
      <rect x="54" y="42" width="150" height="156" rx="10" fill={C.paper} stroke={C.navy} strokeWidth="2.5" />
      <text x="129" y="68" fontSize="13" fontWeight="700" fill={C.navy} textAnchor="middle">薪資單</text>
      <line x1="68" y1="78" x2="190" y2="78" stroke={C.blue100} strokeWidth="2" />
      {lines.map((l, i) => (
        <g key={l.k}>
          <text x="70" y={l.y + 8} fontSize="10" fill={C.n500}>{l.k}</text>
          <text x="98" y={l.y + 8} fontSize="11" fontWeight="700" fill={l.fill}>{l.sign}</text>
          <motion.rect
            x="110" y={l.y} height="10" rx="3" width={l.w} fill={l.fill}
            style={grow}
            initial={{ scaleX: reduce ? 1 : 0 }}
            animate={{ scaleX: 1 }}
            transition={t(reduce, 0.15 + i * 0.15)}
          />
        </g>
      ))}
      <line x1="68" y1="142" x2="190" y2="142" stroke={C.navy} strokeWidth="1.5" />
      <text x="70" y="166" fontSize="11" fontWeight="700" fill={C.navy}>實發</text>
      <motion.rect
        x="110" y="157" height="12" rx="3" width="48" fill={C.blue}
        style={grow}
        initial={{ scaleX: reduce ? 1 : 0 }}
        animate={{ scaleX: 1 }}
        transition={t(reduce, 0.5)}
      />
      {/* 硬幣 */}
      {[0, 1, 2, 3].map((i) => (
        <motion.g
          key={i}
          initial={{ y: reduce ? 0 : -40, opacity: reduce ? 1 : 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={t(reduce, 0.55 + i * 0.1)}
        >
          <ellipse cx="244" cy={180 - i * 11} rx="24" ry="8" fill={C.orangeDeep} />
          <ellipse cx="244" cy={176 - i * 11} rx="24" ry="8" fill={C.orange} stroke={C.orangeDeep} strokeWidth="1.2" />
        </motion.g>
      ))}
    </g>
  );
}

function SceneTax({ reduce }: SceneProps) {
  return (
    <g>
      <Backdrop tint={C.blue50} />
      {/* 扣繳憑單 */}
      <rect x="44" y="52" width="118" height="140" rx="10" fill={C.paper} stroke={C.navy} strokeWidth="2.5" />
      <text x="103" y="77" fontSize="11.5" fontWeight="700" fill={C.navy} textAnchor="middle">扣繳憑單</text>
      <line x1="58" y1="86" x2="148" y2="86" stroke={C.blue100} strokeWidth="2" />
      {[102, 118, 134].map((y, i) => (
        <rect key={y} x="58" y={y} width={[80, 62, 72][i]} height="6" rx="3" fill={C.n200} />
      ))}
      <rect x="58" y="154" width="54" height="22" rx="4" fill={C.orange50} stroke={C.orange} />
      <text x="85" y="169" fontSize="9.5" fontWeight="700" fill={C.orangeDeep} textAnchor="middle">預扣稅</text>
      {/* 國稅局 */}
      <g>
        <path d="M206 92 l40 -22 l40 22 z" fill={C.navy} />
        <rect x="210" y="92" width="72" height="6" fill={C.navy} />
        {[216, 234, 252, 270].map((x) => (
          <rect key={x} x={x} y="100" width="7" height="50" rx="2" fill={C.blue100} stroke={C.navy} strokeWidth="1.2" />
        ))}
        <rect x="204" y="150" width="84" height="8" rx="2" fill={C.navy} />
        <text x="246" y="176" fontSize="10.5" fontWeight="700" fill={C.navy} textAnchor="middle">國稅局</text>
      </g>
      {/* 虛線路徑與移動的硬幣 */}
      <path d="M160 140 C 180 120, 190 118, 206 124" fill="none" stroke={C.orange} strokeWidth="2" strokeDasharray="4 4" />
      <motion.g
        initial={{ x: reduce ? 34 : 0, y: reduce ? -14 : 0, opacity: 1 }}
        animate={{ x: 34, y: -14 }}
        transition={reduce ? { duration: 0 } : { duration: 0.9, delay: 0.3, ease: "easeInOut" }}
      >
        <circle cx="168" cy="138" r="10" fill={C.orange} stroke={C.orangeDeep} strokeWidth="1.5" />
        <text x="168" y="142" fontSize="10" fontWeight="800" fill={C.paper} textAnchor="middle">$</text>
      </motion.g>
    </g>
  );
}

const SCENES: Record<string, (p: SceneProps) => ReactNode> = {
  hr: SceneHR,
  schedule: SceneSchedule,
  punch: ScenePunch,
  leave: SceneLeave,
  confirm: SceneConfirm,
  payroll: ScenePayroll,
  tax: SceneTax,
};

// ---------- 主元件 ----------

export default function EndToEndFlow() {
  const [step, setStep] = useState<number>(0);
  const reduce = useReducedMotion() ?? false;
  const current = STATIONS[step];
  const Scene = SCENES[current.id];
  const last = STATIONS.length - 1;

  const go = (next: number) => setStep(Math.max(0, Math.min(last, next)));
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") go(step + 1);
    if (e.key === "ArrowLeft") go(step - 1);
  };

  const pct = (i: number) => ((i + 0.5) / STATIONS.length) * 100;

  return (
    <div className="not-prose space-y-5 outline-none" tabIndex={0} onKeyDown={onKey} aria-label="從人到薪流程走查，可用左右方向鍵切換">
      {/* 路線軌道 */}
      <div className="relative pt-7">
        {/* 確認閘門 */}
        <div
          className="pointer-events-none absolute top-0 bottom-6 flex -translate-x-1/2 flex-col items-center"
          style={{ left: `${(GATE_BEFORE / STATIONS.length) * 100}%` }}
        >
          <span
            className={clsx(
              "inline-flex items-center gap-1 whitespace-nowrap rounded-pill px-2 py-0.5 text-[11px] font-bold transition-colors",
              step >= GATE_BEFORE ? "bg-blue-700 text-white" : "bg-orange-100 text-orange-700",
            )}
          >
            <Lock size={11} />
            確認閘門
          </span>
          <span
            className={clsx(
              "mt-1 w-0 flex-1 border-l-2 border-dashed transition-colors",
              step >= GATE_BEFORE ? "border-blue-700" : "border-orange-400",
            )}
          />
        </div>

        {/* 底線與進度 */}
        <div className="absolute top-[46px] h-1 rounded-full bg-neutral-200" style={{ left: `${pct(0)}%`, right: `${100 - pct(last)}%` }} />
        <motion.div
          className="absolute top-[46px] h-1 rounded-full bg-orange-400"
          style={{ left: `${pct(0)}%` }}
          initial={false}
          animate={{ width: `${pct(step) - pct(0)}%` }}
          transition={reduce ? { duration: 0 } : { duration: 0.35, ease: "easeOut" }}
        />

        <div className="relative grid grid-cols-7">
          {STATIONS.map((s, i) => {
            const active = i === step;
            const done = i < step;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => go(i)}
                aria-current={active ? "step" : undefined}
                className="group flex flex-col items-center gap-1.5 rounded-md py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                <span
                  className={clsx(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition",
                    active
                      ? clsx(KIND_META[s.kind].dot, "scale-110 text-white shadow-md ring-4 ring-orange-200")
                      : done
                        ? clsx(KIND_META[s.kind].dot, "text-white")
                        : "border-neutral-300 bg-white text-neutral-500 group-hover:border-blue-400 group-hover:text-blue-700",
                  )}
                >
                  {i + 1}
                </span>
                <span
                  className={clsx(
                    "whitespace-nowrap text-[11px] leading-tight sm:text-xs",
                    active ? "font-bold text-blue-900" : "text-neutral-500",
                  )}
                >
                  {s.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 圖例 */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-neutral-500">
        {(Object.keys(KIND_META) as Kind[]).map((k) => (
          <span key={k} className={clsx("inline-flex items-center gap-1.5", current.kind === k && "text-neutral-900")}>
            <span className={clsx("h-2.5 w-2.5 rounded-full border", KIND_META[k].dot, k === "planned" && "border-dashed")} />
            <span className="font-semibold">{KIND_META[k].label}</span>
            <span className="hidden sm:inline">{KIND_HINT[k]}</span>
          </span>
        ))}
      </div>

      {/* 舞台：插圖＋說明 */}
      <div className="grid items-center gap-5 rounded-xl bg-neutral-50 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] sm:p-5">
        <div className="mx-auto w-full max-w-[340px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.svg
              key={current.id}
              viewBox="0 0 320 220"
              width="100%"
              role="img"
              aria-label={`${current.name}的示意插圖`}
              initial={reduce ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              style={{ fontFamily: "var(--font-sans)" }}
            >
              <Scene reduce={reduce} />
            </motion.svg>
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current.id}
            initial={reduce ? false : { opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="min-w-0 space-y-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-2xl font-bold leading-none text-orange-400">
                {String(step + 1).padStart(2, "0")}
              </span>
              <span className="text-lg font-bold leading-none text-blue-900">{current.name}</span>
              <KindBadge kind={current.kind} />
            </div>

            <div className="text-sm leading-relaxed text-neutral-700">{current.what}</div>

            <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-x-2 gap-y-2 text-sm">
              <span className="pt-0.5 text-xs font-semibold text-neutral-500">用到</span>
              <span className="flex flex-wrap gap-1.5">
                {current.uses.map((u) => (
                  <span key={u} className="rounded-md bg-white px-2 py-0.5 text-xs text-neutral-700 ring-1 ring-neutral-200">
                    {u}
                  </span>
                ))}
              </span>
              <span className="pt-0.5 text-xs font-semibold text-neutral-500">產出</span>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-800">
                <ArrowRight size={14} className="shrink-0 text-orange-500" />
                {current.output}
              </span>
            </div>

            <div className="space-y-1.5 border-t border-neutral-200 pt-3">
              <div className="text-xs font-semibold text-neutral-500">對應 PL3 第三層模組</div>
              <div className="flex flex-col items-start gap-1.5">
                {current.modules.map((code) => (
                  <ModuleBadge key={code} code={code} />
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 走查按鈕 */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => go(step - 1)}
          disabled={step === 0}
          className="inline-flex items-center gap-1 rounded-pill border border-neutral-300 bg-white px-3.5 py-1.5 text-sm text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft size={14} />
          上一站
        </button>
        <span className="text-xs text-neutral-400">
          {step + 1} / {STATIONS.length}
        </span>
        <button
          type="button"
          onClick={() => go(step + 1)}
          disabled={step === last}
          className="inline-flex items-center gap-1 rounded-pill bg-blue-700 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          下一站
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
