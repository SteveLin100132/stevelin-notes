import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, CircleHelp, Minus, Pause, SlidersHorizontal, TriangleAlert } from "lucide-react";
import { clsx } from "clsx";

// 注意：筆記頁面的 .nc-prose 會覆寫 p / ul / li / h* 的字級與間距，
// 所以本元件的文字一律用 div / span，不用那些元素。

// ---------- 數字設定（集中管理） ----------

const RATES = {
  minimumWageMonthly: {
    value: 29_500,
    effectiveFrom: "2026-01-01",
    source: "勞動部公告最低工資（查證 2026-09-24）https://www.mol.gov.tw/1607/1632/1633/84947/post",
  },
  nonResidentThreshold: {
    multiplier: 1.5, // 最低工資 × 1.5 ＝ 44,250
    effectiveFrom: "2026-01-01",
    source: "各類所得扣繳率標準第 3 條；財政部公告（查證 2026-09-24）",
  },
  nonResidentRateLow: { value: 0.06, effectiveFrom: "2009-01-01", source: "各類所得扣繳率標準第 3 條" },
  nonResidentRateHigh: { value: 0.18, effectiveFrom: "現行", source: "各類所得扣繳率標準第 3 條" },
  residentFlatRate: { value: 0.05, effectiveFrom: "現行", source: "各類所得扣繳率標準第 2 條" },
  residentProfessional: { value: 0.1, effectiveFrom: "現行", source: "各類所得扣繳率標準第 2 條（執行業務者報酬）" },
  nonResidentProfessional: { value: 0.2, effectiveFrom: "現行", source: "各類所得扣繳率標準第 3 條（執行業務者報酬）" },
  residentExemptTax: { value: 2_000, effectiveFrom: "現行", source: "各類所得扣繳率標準第 13 條（每次應扣稅額不超過者免扣）" },
  supplementaryRate: {
    value: 0.0211,
    effectiveFrom: "2021-01-01",
    source: "健保署〈補充保險費計算公式〉（查證 2026-09-24）https://www.nhi.gov.tw/ch/cp-4516-74b0f-2613-1.html",
  },
  supplementaryProfessionalFloor: {
    value: 20_000,
    effectiveFrom: "現行",
    source: "健保署〈補充保險費計算公式〉：執行業務收入單次給付達 20,000 元（查證 2026-09-24）",
  },
  pensionEmployerMin: { value: 0.06, effectiveFrom: "現行", source: "勞工退休金條例第 14 條第 1 項" },
  pensionEmployeeMax: { value: 0.06, effectiveFrom: "現行", source: "勞工退休金條例第 14 條第 3 項" },
  occupationalInsuranceSince: {
    value: "2022-05-01",
    effectiveFrom: "2022-05-01",
    source: "勞工職業災害保險及保護法施行日；勞保局〈職保簡介〉（查證 2026-09-24）https://www.bli.gov.tw/0105825.html",
  },
} as const;

// 人數、期間、次數等法定上限，也集中在這裡，不要寫死在說明文字裡
const LIMITS = {
  laborInsuranceMinEmployees: { value: 5, effectiveFrom: "現行", source: "勞工保險條例第 6 條第 1 項第 2 款" },
  sickLeaveContinuationYears: {
    ordinary: 1,
    occupational: 2,
    effectiveFrom: "現行",
    source: "勞工保險條例第 9 條第 3 款",
  },
  pensionStopReportDays: { value: 7, effectiveFrom: "現行", source: "勞工退休金條例第 20 條第 1 項" },
  pensionRateChangesPerYear: { value: 2, effectiveFrom: "現行", source: "勞工退休金條例第 15 條第 1 項" },
  nhiResidenceMonths: { value: 6, effectiveFrom: "現行", source: "全民健康保險法第 9 條第 1 款" },
  supplementaryBonusMultiple: { value: 4, effectiveFrom: "現行", source: "全民健康保險法第 31 條第 1 項第 1 款" },
} as const;

const THRESHOLD = RATES.minimumWageMonthly.value * RATES.nonResidentThreshold.multiplier;

// ---------- 題目 ----------

type Contract = "employment" | "mandate" | "contractor";
type Nationality = "local" | "spouse" | "pr" | "foreign";
type Employment = "active" | "leave";
type LeaveReason = "parental" | "sick" | "other";
type Tax = "resident" | "nonresident";

type Answers = { contract: Contract; nationality: Nationality; employment: Employment; leaveReason: LeaveReason; tax: Tax };

type Option<T extends string> = { value: T; label: string; hint: string };
type Question<K extends keyof Answers> = { key: K; title: string; options: Option<Answers[K]>[] };

const Q_CONTRACT: Question<"contract"> = {
  key: "contract",
  title: "契約性質",
  options: [
    { value: "employment", label: "僱傭", hint: "提供勞務、聽公司指揮" },
    { value: "mandate", label: "委任", hint: "處理事務，例如委任經理人" },
    { value: "contractor", label: "承攬", hint: "完成工作、交出成果" },
  ],
};
const Q_NATIONALITY: Question<"nationality"> = {
  key: "nationality",
  title: "國籍與居留",
  options: [
    { value: "local", label: "本國籍", hint: "中華民國國民" },
    { value: "spouse", label: "外籍配偶", hint: "含陸港澳配偶，獲准居留工作" },
    { value: "pr", label: "永久居留", hint: "取得永久居留的外國人" },
    { value: "foreign", label: "一般外籍", hint: "持居留證受僱，非上述身分" },
  ],
};
const Q_EMPLOYMENT: Question<"employment"> = {
  key: "employment",
  title: "在職狀態",
  options: [
    { value: "active", label: "在職", hint: "正常上班" },
    { value: "leave", label: "留職停薪", hint: "保留職位、暫停上班與發薪" },
  ],
};
const Q_LEAVE_REASON: Question<"leaveReason"> = {
  key: "leaveReason",
  title: "留停原因",
  options: [
    { value: "parental", label: "育嬰", hint: "性別平等工作法第 16 條" },
    { value: "sick", label: "傷病", hint: "因傷病請假致留職停薪" },
    { value: "other", label: "其他", hint: "進修、個人因素等" },
  ],
};
const Q_TAX: Question<"tax"> = {
  key: "tax",
  title: "納稅身分",
  options: [
    { value: "resident", label: "居住者", hint: "有住所，或當年在台滿 183 天" },
    { value: "nonresident", label: "非居住者", hint: "當年在台未滿 183 天" },
  ],
};

// ---------- 結果 ----------

type Status = "yes" | "no" | "optional" | "paused" | "review";

type Row = { item: string; status: Status; detail: string; law: string };

// 不論選什麼，適用結果都固定列出這 10 項；不適用就標「不適用」，不隱藏
const ITEMS = [
  "勞基法",
  "勞保",
  "職災保險",
  "就業保險",
  "健保",
  "勞退 公司提繳",
  "勞退 個人自提",
  "薪資扣繳",
  "報酬扣繳",
  "補充保費",
] as const;

const STATUS_META: Record<Status, { label: string; icon: ReactNode; badge: string }> = {
  yes: { label: "適用", icon: <Check size={13} strokeWidth={2.5} />, badge: "border-blue-700 bg-blue-700 text-white" },
  no: { label: "不適用", icon: <Minus size={13} strokeWidth={2.5} />, badge: "border-neutral-300 bg-neutral-50 text-neutral-500" },
  optional: { label: "可選擇", icon: <SlidersHorizontal size={13} strokeWidth={2.5} />, badge: "border-dashed border-blue-400 bg-blue-50 text-blue-700" },
  paused: { label: "暫停", icon: <Pause size={13} strokeWidth={2.5} />, badge: "border-neutral-400 bg-neutral-100 text-neutral-700" },
  review: { label: "待確認", icon: <CircleHelp size={13} strokeWidth={2.5} />, badge: "border-orange-400 bg-orange-50 text-orange-700" },
};

const fmt = (n: number) => n.toLocaleString("zh-TW");
const pct = (r: number) => `${+(r * 100).toFixed(2)}%`;

function evaluateContractor(a: Answers, amount: number): Row[] {
  const resident = a.tax === "resident";
  const rate = resident ? RATES.residentProfessional.value : RATES.nonResidentProfessional.value;
  const tax = Math.round(amount * rate);
  const exempt = resident && tax <= RATES.residentExemptTax.value;
  const floor = RATES.supplementaryProfessionalFloor.value;
  const supp = Math.round(amount * RATES.supplementaryRate.value);

  return [
    { item: "勞基法", status: "no", detail: "承攬不是勞動契約。但實際要打卡、聽指揮、按月領固定報酬的，可能被認定為僱傭。", law: "民法第 490 條、勞基法第 2 條" },
    { item: "勞保", status: "no", detail: "公司不替他加保；本人可透過職業工會加保。", law: "勞保條例第 6 條第 1 項第 7 款" },
    { item: "職災保險", status: "no", detail: "公司不替他加保；本人可透過職業工會加保。", law: "職保法第 7 條" },
    { item: "就業保險", status: "no", detail: "不是公司的受僱員工，公司不替他加保。", law: "就業保險法第 5 條" },
    { item: "健保", status: "no", detail: "公司不以受僱者身分替他投保，由本人依自己的身分投保。", law: "健保法" },
    { item: "勞退 公司提繳", status: "no", detail: "不是公司的勞工，公司不提繳。", law: "勞退條例第 7 條" },
    { item: "勞退 個人自提", status: "optional", detail: `本人若是自營作業者，可在 ${pct(RATES.pensionEmployeeMax.value)} 內自願提繳，自己向勞保局繳。`, law: "勞退條例第 7 條第 2 項、第 14 條第 4 項" },
    { item: "薪資扣繳", status: "no", detail: "承攬報酬不是薪資，不走薪資扣繳，改看下一項的報酬扣繳。", law: "所得稅法第 88 條" },
    {
      item: "報酬扣繳",
      status: "review",
      detail: exempt
        ? `假設屬執行業務報酬：${fmt(amount)} × ${pct(rate)} ＝ ${fmt(tax)} 元，不超過 ${fmt(RATES.residentExemptTax.value)} 元，免扣繳。所得歸類待確認。`
        : `假設屬執行業務報酬：${fmt(amount)} × ${pct(rate)} ＝ ${fmt(tax)} 元。所得歸類待確認。`,
      law: resident ? "扣繳率標準第 2、13 條" : "扣繳率標準第 3 條",
    },
    resident
      ? {
          item: "補充保費",
          status: amount >= floor ? "yes" : "no",
          detail:
            amount >= floor
              ? `單次 ${fmt(amount)} 元，達 ${fmt(floor)} 元：× ${pct(RATES.supplementaryRate.value)} ＝ ${fmt(supp)} 元。`
              : `單次 ${fmt(amount)} 元，未達 ${fmt(floor)} 元，不扣。`,
          law: "健保法第 31 條",
        }
      : { item: "補充保費", status: "review", detail: "只向健保的保險對象扣；非居住者有沒有在保，要個別確認。", law: "健保法第 31 條" },
  ];
}

function evaluate(a: Answers, amount: number): Row[] {
  const rows = a.contract === "contractor" ? evaluateContractor(a, amount) : evaluateEmployee(a, amount);
  return ITEMS.map(
    (item) => rows.find((r) => r.item === item) ?? { item, status: "review", detail: "這個組合還沒有對應的規則，待補。", law: "" },
  );
}

function evaluateEmployee(a: Answers, amount: number): Row[] {
  const mandate = a.contract === "mandate";
  const onLeave = a.employment === "leave";
  const leave = onLeave ? a.leaveReason : null;
  const employmentInsurance = a.nationality === "local" || a.nationality === "spouse";

  const lsa: Row = mandate
    ? { item: "勞基法", status: "review", detail: "委任一般不適用，但職稱不算數，要看實際有沒有從屬性。", law: "民法第 528 條、勞基法第 2 條" }
    : { item: "勞基法", status: "yes", detail: "工時、加班、休假、資遣都照勞基法。", law: "民法第 482 條、勞基法第 2 條" };

  let li: Row;
  if (mandate) li = { item: "勞保", status: "review", detail: "委任經理人是否屬強制加保對象，待顧問確認。", law: "勞保條例第 6 條" };
  else if (leave === "parental") li = { item: "勞保", status: "optional", detail: "可繼續加保，原公司負擔的保費免繳。", law: "性平法第 16 條第 2 項" };
  else if (leave === "sick") li = { item: "勞保", status: "optional", detail: `可繼續加保：普通傷病最多 ${LIMITS.sickLeaveContinuationYears.ordinary} 年、職災最多 ${LIMITS.sickLeaveContinuationYears.occupational} 年。`, law: "勞保條例第 9 條第 3 款" };
  else if (leave === "other") li = { item: "勞保", status: "review", detail: "非育嬰、非傷病的留停能否續保，待查證。", law: "勞保條例" };
  else
    li = {
      item: "勞保",
      status: "yes",
      detail: a.nationality === "local" ? `${LIMITS.laborInsuranceMinEmployees.value} 人以上的單位強制加保，到職當天加保。` : "包括在職外國籍員工，到職當天加保。",
      law: "勞保條例第 6、11 條",
    };

  let occ: Row;
  if (mandate) occ = { item: "職災保險", status: "review", detail: "委任經理人是否屬職保法的受僱勞工，待顧問確認。", law: "職保法第 6 條" };
  else if (onLeave) occ = { item: "職災保險", status: "review", detail: "職保法條文未見留停續保規定，留停期間怎麼處理待查證。", law: "職保法" };
  else
    occ = {
      item: "職災保險",
      status: "yes",
      detail: `${RATES.occupationalInsuranceSince.value} 起獨立辦理：不限公司人數、外籍也要保，到職當天生效，保費全由公司負擔。`,
      law: "職保法第 6、11、13、19 條",
    };

  let ei: Row;
  if (!employmentInsurance) ei = { item: "就業保險", status: "no", detail: "只涵蓋本國籍與獲准居留工作的配偶。", law: "就業保險法第 5 條" };
  else if (mandate) ei = { item: "就業保險", status: "review", detail: "委任經理人是否屬受僱勞工，待顧問確認。", law: "就業保險法第 5 條" };
  else if (leave === "parental") ei = { item: "就業保險", status: "optional", detail: "屬原有社會保險，可繼續參加。", law: "性平法第 16 條第 2 項" };
  else if (leave === "sick") ei = { item: "就業保險", status: "review", detail: "傷病留停能否續保，待查證。", law: "就業保險法" };
  else if (leave === "other") ei = { item: "就業保險", status: "review", detail: "非育嬰、非傷病的留停能否續保，待查證。", law: "就業保險法" };
  else ei = { item: "就業保險", status: "yes", detail: "與勞保一起加保。", law: "就業保險法第 5 條" };

  let nhi: Row;
  if (mandate) nhi = { item: "健保", status: "review", detail: "要加健保，但投保類別與身分待確認。", law: "健保法第 10 條" };
  else if (leave === "parental") nhi = { item: "健保", status: "optional", detail: "可在原公司續保，原公司負擔的保費免繳。", law: "性平法第 16 條第 2 項" };
  else if (leave === "sick") nhi = { item: "健保", status: "review", detail: "傷病留停能否在原公司續保，待查證。", law: "健保法" };
  else if (leave === "other") nhi = { item: "健保", status: "review", detail: "非育嬰、非傷病的留停能否在原公司續保，待查證。", law: "健保法" };
  else
    nhi = {
      item: "健保",
      status: "yes",
      detail: a.nationality === "local" ? "投保當月收全月，退保當月免繳。" : `有居留證且受僱，受僱就加保，不必等 ${LIMITS.nhiResidenceMonths.value} 個月。`,
      law: a.nationality === "local" ? "健保法第 30 條" : "健保法第 9 條",
    };

  let pensionCo: Row;
  let pensionSelf: Row;
  if (mandate) {
    pensionCo = { item: "勞退 公司提繳", status: "optional", detail: `公司可在 ${pct(RATES.pensionEmployerMin.value)} 內為受委任工作者提繳。`, law: "勞退條例第 14 條第 2 項" };
    pensionSelf = { item: "勞退 個人自提", status: "optional", detail: `可在 ${pct(RATES.pensionEmployeeMax.value)} 內自願提繳，從報酬扣。`, law: "勞退條例第 7 條第 2 項、第 14 條第 3 項" };
  } else if (a.nationality === "foreign") {
    pensionCo = { item: "勞退 公司提繳", status: "no", detail: "一般外籍不在勞退新制強制範圍；是否適用舊制退休金，待顧問確認。", law: "勞退條例第 7 條" };
    pensionSelf = { item: "勞退 個人自提", status: "no", detail: "不適用勞退新制，沒有個人專戶可以自提。", law: "勞退條例第 7 條" };
  } else if (onLeave) {
    pensionCo = { item: "勞退 公司提繳", status: "paused", detail: `留停期間 ${LIMITS.pensionStopReportDays.value} 日內申報停止提繳，復職再開始。`, law: "勞退條例第 20 條" };
    pensionSelf = { item: "勞退 個人自提", status: "paused", detail: "跟著停止；留停沒有薪水，也沒得扣。", law: "勞退條例第 20 條" };
  } else {
    pensionCo = {
      item: "勞退 公司提繳",
      status: "yes",
      detail: `公司至少提繳 ${pct(RATES.pensionEmployerMin.value)}，公司出錢，不從薪水扣。`,
      law: "勞退條例第 14 條第 1 項、第 16 條",
    };
    pensionSelf = {
      item: "勞退 個人自提",
      status: "optional",
      detail: `員工可選 0 到 ${pct(RATES.pensionEmployeeMax.value)}，從薪水扣，不計入當年度所得。一年最多調整 ${LIMITS.pensionRateChangesPerYear.value} 次。`,
      law: "勞退條例第 14 條第 3 項、第 15 條、細則第 21 條",
    };
  }

  const high = amount > THRESHOLD;
  const rate = high ? RATES.nonResidentRateHigh.value : RATES.nonResidentRateLow.value;
  const tax: Row = onLeave && !mandate
    ? { item: "薪資扣繳", status: "paused", detail: "留停期間不發薪，沒有薪資可扣；復職後恢復。", law: "所得稅法第 88 條" }
    : a.tax === "resident"
      ? { item: "薪資扣繳", status: "yes", detail: `按扣繳稅額表，或全月給付總額扣 ${pct(RATES.residentFlatRate.value)}。`, law: "扣繳率標準第 2 條" }
      : {
          item: "薪資扣繳",
          status: "yes",
          detail: `月薪 ${fmt(amount)} ${high ? "＞" : "≤"} ${fmt(THRESHOLD)}，扣 ${pct(rate)} ＝ ${fmt(Math.round(amount * rate))} 元。`,
          law: "扣繳率標準第 3 條",
        };

  const fee: Row = mandate
    ? { item: "報酬扣繳", status: "review", detail: "委任報酬一般按薪資扣繳；是否一律列為薪資所得，待顧問確認。", law: "所得稅法第 88 條" }
    : { item: "報酬扣繳", status: "no", detail: "領的是薪資，不是承攬報酬，照上一項的薪資扣繳。", law: "所得稅法第 88 條" };

  const supp: Row = {
    item: "補充保費",
    status: "no",
    detail: `公司自己發的薪資平常不另扣。例外：全年獎金超過當月投保金額 ${LIMITS.supplementaryBonusMultiple.value} 倍的部分要扣（第 05 篇）。`,
    law: "健保法第 31 條",
  };

  return [lsa, li, occ, ei, nhi, pensionCo, pensionSelf, tax, fee, supp];
}

// ---------- 插圖：三種契約 ----------

const C = {
  navy: "var(--blue-700)",
  blue: "var(--blue-500)",
  blue200: "var(--blue-200)",
  blue100: "var(--blue-100)",
  blue50: "var(--blue-50)",
  orange: "var(--orange-400)",
  orangeDeep: "var(--orange-500)",
  orange100: "var(--orange-100)",
  orange50: "var(--orange-50)",
  n200: "var(--neutral-200)",
  n300: "var(--neutral-300)",
  n500: "var(--neutral-500)",
  paper: "#ffffff",
};

const SCENE_TEXT: Record<Contract, { title: string; line: string }> = {
  employment: { title: "僱傭：交出「時間」", line: "照公司的時間、地點、方法做事，按時間領薪水。" },
  mandate: { title: "委任：交出「處理」", line: "受託處理事務，怎麼做有較大的自主空間。" },
  contractor: { title: "承攬：交出「成果」", line: "做完、交件才拿報酬，過程自己安排。" },
};

function Person({ x, tint }: { x: number; tint: string }) {
  return (
    <g>
      <circle cx={x} cy="44" r="11" fill={tint} />
      <path d={`M${x - 17} 96 v-18 a17 17 0 0 1 34 0 v18 z`} fill={tint} />
    </g>
  );
}

function SceneEmployment({ reduce }: { reduce: boolean }) {
  return (
    <g>
      <ellipse cx="120" cy="100" rx="96" ry="6" fill={C.n200} opacity="0.7" />
      {/* 桌子 */}
      <rect x="92" y="72" width="88" height="6" rx="3" fill={C.navy} />
      <rect x="100" y="78" width="4" height="20" fill={C.navy} />
      <rect x="168" y="78" width="4" height="20" fill={C.navy} />
      <rect x="126" y="52" width="36" height="22" rx="3" fill={C.blue100} stroke={C.navy} strokeWidth="2" />
      <Person x={78} tint={C.navy} />
      {/* 時鐘：公司決定時間 */}
      <circle cx="200" cy="36" r="18" fill={C.paper} stroke={C.navy} strokeWidth="2.5" />
      <line x1="200" y1="36" x2="200" y2="25" stroke={C.navy} strokeWidth="2.5" strokeLinecap="round" />
      <motion.line
        x1="200" y1="36" x2="200" y2="22" stroke={C.orange} strokeWidth="2" strokeLinecap="round"
        style={{ transformBox: "view-box", transformOrigin: "200px 36px" }}
        initial={{ rotate: reduce ? 90 : 0 }}
        animate={{ rotate: 90 }}
        transition={reduce ? { duration: 0 } : { duration: 0.6, ease: "easeOut" }}
      />
      <circle cx="200" cy="36" r="2.5" fill={C.orange} />
      {/* 打卡證 */}
      <rect x="68" y="62" width="20" height="14" rx="2" fill={C.orange} />
      <line x1="72" y1="67" x2="84" y2="67" stroke={C.paper} strokeWidth="1.5" />
    </g>
  );
}

function SceneMandate({ reduce }: { reduce: boolean }) {
  return (
    <g>
      <ellipse cx="120" cy="100" rx="96" ry="6" fill={C.n200} opacity="0.7" />
      <Person x={70} tint={C.navy} />
      {/* 公事包 */}
      <rect x="86" y="74" width="26" height="18" rx="3" fill={C.orange} />
      <path d="M94 74 v-4 h10 v4" fill="none" stroke={C.orangeDeep} strokeWidth="2" />
      {/* 委任書 */}
      <motion.g
        style={{ transformBox: "view-box", transformOrigin: "170px 56px" }}
        initial={{ scale: reduce ? 1 : 0.6, opacity: reduce ? 1 : 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={reduce ? { duration: 0 } : { duration: 0.35, ease: "easeOut", delay: 0.1 }}
      >
        <rect x="142" y="22" width="56" height="68" rx="4" fill={C.paper} stroke={C.navy} strokeWidth="2" />
        <text x="170" y="38" fontSize="9" fontWeight="700" fill={C.navy} textAnchor="middle">委任書</text>
        <line x1="150" y1="48" x2="190" y2="48" stroke={C.blue200} strokeWidth="2" />
        <line x1="150" y1="56" x2="186" y2="56" stroke={C.blue200} strokeWidth="2" />
        <line x1="150" y1="64" x2="182" y2="64" stroke={C.blue200} strokeWidth="2" />
        <circle cx="184" cy="78" r="7" fill="none" stroke={C.orangeDeep} strokeWidth="2" />
      </motion.g>
      {/* 自主安排：箭頭分岔 */}
      <path d="M112 44 q14 -14 26 -6" fill="none" stroke={C.blue} strokeWidth="2" strokeDasharray="3 3" />
    </g>
  );
}

function SceneContractor({ reduce }: { reduce: boolean }) {
  return (
    <g>
      <ellipse cx="120" cy="100" rx="96" ry="6" fill={C.n200} opacity="0.7" />
      <Person x={62} tint={C.navy} />
      <Person x={194} tint={C.n300} />
      {/* 交付的成果箱 */}
      <motion.g
        initial={{ x: reduce ? 0 : -36 }}
        animate={{ x: 0 }}
        transition={reduce ? { duration: 0 } : { duration: 0.5, ease: "easeOut" }}
      >
        <rect x="112" y="60" width="36" height="30" rx="3" fill={C.orange100} stroke={C.orangeDeep} strokeWidth="2" />
        <line x1="112" y1="70" x2="148" y2="70" stroke={C.orangeDeep} strokeWidth="2" />
        <path d="M122 80 l5 5 l10 -10" fill="none" stroke={C.navy} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </motion.g>
      {/* 報酬 */}
      <motion.g
        style={{ transformBox: "view-box", transformOrigin: "194px 22px" }}
        initial={{ scale: reduce ? 1 : 0, opacity: reduce ? 1 : 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={reduce ? { duration: 0 } : { duration: 0.3, ease: "easeOut", delay: 0.45 }}
      >
        <circle cx="194" cy="22" r="10" fill={C.orange} />
        <text x="194" y="26" fontSize="10" fontWeight="700" fill={C.paper} textAnchor="middle">$</text>
      </motion.g>
    </g>
  );
}

function ContractScene({ contract, reduce }: { contract: Contract; reduce: boolean }) {
  const text = SCENE_TEXT[contract];
  return (
    <div className="flex items-center gap-3 rounded-lg bg-blue-50/60 px-3 py-2">
      <svg viewBox="0 0 240 108" width="100%" className="h-auto w-[45%] min-w-[120px] max-w-[200px] shrink-0" role="img" aria-label={text.title}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.g
            key={contract}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: "easeOut" }}
          >
            {contract === "employment" && <SceneEmployment reduce={reduce} />}
            {contract === "mandate" && <SceneMandate reduce={reduce} />}
            {contract === "contractor" && <SceneContractor reduce={reduce} />}
          </motion.g>
        </AnimatePresence>
      </svg>
      <div className="min-w-0 space-y-1">
        <span className="block text-sm font-bold text-blue-800">{text.title}</span>
        <span className="block text-xs leading-relaxed text-neutral-600">{text.line}</span>
      </div>
    </div>
  );
}

// ---------- 元件 ----------

function OptionGroup<K extends keyof Answers>({
  q,
  index,
  value,
  onChange,
  disabled = false,
  note,
}: {
  q: Question<K>;
  index: ReactNode;
  value: Answers[K];
  onChange: (v: Answers[K]) => void;
  disabled?: boolean;
  note?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={q.title}
      aria-disabled={disabled}
      className={clsx("space-y-2 transition-opacity duration-200", disabled && "opacity-40")}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-neutral-800">
        <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-blue-700 px-1 text-[11px] font-bold text-white">
          {index}
        </span>
        {q.title}
        {note && <span className="text-xs font-normal text-neutral-500">{note}</span>}
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2">
        {q.options.map((o) => {
          const active = o.value === value && !disabled;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(o.value)}
              className={clsx(
                "rounded-lg border px-3 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
                disabled && "cursor-not-allowed",
                active
                  ? "border-blue-700 bg-blue-50 text-blue-800"
                  : "border-neutral-200 bg-white text-neutral-700 enabled:hover:border-blue-300 enabled:hover:bg-blue-50/40",
              )}
            >
              <span className="block text-sm font-semibold">{o.label}</span>
              <span className="mt-0.5 block text-xs leading-snug text-neutral-500">{o.hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function IdentityDecisionTree() {
  const reduce = useReducedMotion() ?? false;
  const [answers, setAnswers] = useState<Answers>({
    contract: "employment",
    nationality: "local",
    employment: "active",
    leaveReason: "parental",
    tax: "resident",
  });
  const [amount, setAmount] = useState<number>(40_000);

  const set = <K extends keyof Answers>(key: K) => (v: Answers[K]) => setAnswers((prev) => ({ ...prev, [key]: v }));
  const contractor = answers.contract === "contractor";
  const showLeaveReason = !contractor && answers.employment === "leave";
  const showAmount = contractor || answers.tax === "nonresident";

  const rows = evaluate(answers, amount);
  const reviewCount = rows.filter((r) => r.status === "review").length;
  const signature = `${answers.contract}-${answers.nationality}-${answers.employment}-${answers.leaveReason}-${answers.tax}`;

  const collapse = {
    initial: reduce ? false : { opacity: 0, height: 0 },
    animate: { opacity: 1, height: "auto" },
    exit: reduce ? { opacity: 0 } : { opacity: 0, height: 0 },
    transition: { duration: reduce ? 0 : 0.25, ease: "easeOut" },
  } as const;

  return (
    <div className="not-prose mx-auto grid max-w-4xl gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* 左：題目 */}
      <div className="min-w-0 space-y-5">
        <OptionGroup q={Q_CONTRACT} index={1} value={answers.contract} onChange={set("contract")} />
        <OptionGroup q={Q_NATIONALITY} index={2} value={answers.nationality} onChange={set("nationality")} />
        <div>
          <OptionGroup
            q={Q_EMPLOYMENT}
            index={3}
            value={answers.employment}
            onChange={set("employment")}
            disabled={contractor}
            note={contractor ? "承攬沒有任職關係，不適用" : undefined}
          />
          <AnimatePresence initial={false}>
            {showLeaveReason && (
              <motion.div key="leave-reason" {...collapse} className="overflow-hidden">
                <div className="ml-2.5 mt-3 border-l-2 border-blue-200 pl-3">
                  <OptionGroup q={Q_LEAVE_REASON} index="3-1" value={answers.leaveReason} onChange={set("leaveReason")} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <OptionGroup q={Q_TAX} index={4} value={answers.tax} onChange={set("tax")} />

        <AnimatePresence initial={false}>
          {showAmount && (
            <motion.div key="amount" {...collapse} className="overflow-hidden">
              <div className="space-y-2 rounded-lg bg-neutral-50 px-3 py-3">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-semibold text-neutral-800">{contractor ? "單次報酬" : "全月薪資"}</span>
                  <span className="font-mono font-semibold text-blue-800">{fmt(amount)} 元</span>
                </div>
                <input
                  type="range"
                  min={5_000}
                  max={80_000}
                  step={500}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  aria-label={contractor ? "單次報酬" : "全月薪資"}
                  className="w-full accent-blue-700"
                />
                <div className="text-xs text-neutral-500">
                  {contractor
                    ? `補充保費：單次達 ${fmt(RATES.supplementaryProfessionalFloor.value)} 元才扣，費率 ${pct(RATES.supplementaryRate.value)}（${RATES.supplementaryRate.effectiveFrom} 起）`
                    : `門檻 ${fmt(THRESHOLD)} 元 ＝ 最低工資 ${fmt(RATES.minimumWageMonthly.value)} × ${RATES.nonResidentThreshold.multiplier}（${RATES.minimumWageMonthly.effectiveFrom} 起）`}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 右：結果 */}
      <div className="min-w-0 space-y-3">
        <ContractScene contract={answers.contract} reduce={reduce} />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold text-neutral-800">適用結果</span>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(STATUS_META) as Status[]).map((s) => (
              <span
                key={s}
                className={clsx("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]", STATUS_META[s].badge)}
              >
                {STATUS_META[s].icon}
                {STATUS_META[s].label}
              </span>
            ))}
          </div>
        </div>

        <div className="divide-y divide-neutral-100 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          {rows.map((r, i) => (
            <motion.div
              key={`${signature}-${r.item}`}
              initial={reduce ? false : { opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: reduce ? 0 : 0.25, ease: "easeOut", delay: reduce ? 0 : i * 0.03 }}
              className={clsx("flex gap-3 px-3 py-2.5", r.status === "review" && "bg-orange-50/60")}
            >
              <div className="w-[4.5rem] shrink-0 pt-0.5 text-sm font-semibold leading-snug text-neutral-800">
                {/* 「勞退 公司提繳」這類兩段名稱拆成兩行，避免在窄版斷在字中間 */}
                {r.item.split(" ").map((part) => (
                  <span key={part} className="block">{part}</span>
                ))}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <span
                  className={clsx(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
                    STATUS_META[r.status].badge,
                  )}
                >
                  {STATUS_META[r.status].icon}
                  {STATUS_META[r.status].label}
                </span>
                <div className="text-sm leading-relaxed text-neutral-700">{r.detail}</div>
                <div className="text-xs text-neutral-400">{r.law}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {(contractor || reviewCount > 0) && (
          <div className="flex items-start gap-2 rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-sm text-orange-800">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" />
            <span>
              {contractor
                ? "契約名稱不算數。要打卡、聽指揮、按月領固定報酬的「承攬」，可能被認定為勞動契約，勞健保、勞退、加班費都要補。系統不應自動認定，需人資或顧問覆核。"
                : `這個組合有 ${reviewCount} 項灰色地帶，系統不應自動判定，需人資或顧問覆核後再生效。`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
