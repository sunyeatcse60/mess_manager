// All mess accounting lives here (pure functions, easy to reason about).
//
// Rules
//  - Meal rate      = total bazar (grocery) cost of the month / total meals eaten
//  - Meal cost      = member meals x meal rate
//  - Bua / shared   = total bua bills split equally among the month's participants
//  - Net balance    = deposits + money paid from own pocket - meal cost - bua share
//        net > 0  -> member gets money back
//        net < 0  -> member has to pay
//  - A bazar / bua entry can be paid "from the mess fund" (payerId = 'fund')
//    or from a member's own pocket (payerId = memberId) which becomes his credit.

export const FUND = 'fund';
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const inMonth = (item, month) => (item.date || '').startsWith(month);

export function computeMonth(data, month) {
  const { members, deposits, bazar, bua, meals } = data;

  const dep = deposits.filter((d) => inMonth(d, month));
  const baz = bazar.filter((d) => inMonth(d, month));
  const bu = bua.filter((d) => inMonth(d, month));
  const mealDays = Object.keys(meals).filter((d) => d.startsWith(month));

  const mealsOf = {};
  const depOf = {};
  const paidOf = {};
  members.forEach((m) => {
    mealsOf[m.id] = 0;
    depOf[m.id] = 0;
    paidOf[m.id] = 0;
  });

  mealDays.forEach((d) => {
    Object.entries(meals[d] || {}).forEach(([id, v]) => {
      if (id in mealsOf) mealsOf[id] += Number(v) || 0;
    });
  });
  dep.forEach((d) => {
    if (d.memberId in depOf) depOf[d.memberId] += Number(d.amount) || 0;
  });

  const sum = (arr) => arr.reduce((a, b) => a + (Number(b.amount) || 0), 0);
  const totalDeposit = sum(dep);
  const totalBazar = sum(baz);
  const totalBua = sum(bu);
  const totalMeals = Object.values(mealsOf).reduce((a, b) => a + b, 0);

  let fundPaid = 0;
  [...baz, ...bu].forEach((e) => {
    const amt = Number(e.amount) || 0;
    if (e.payerId && e.payerId !== FUND && e.payerId in paidOf) paidOf[e.payerId] += amt;
    else fundPaid += amt;
  });

  const mealRate = totalMeals > 0 ? totalBazar / totalMeals : 0;

  // Participants: active members + anyone who has activity this month
  const participants = members.filter(
    (m) => m.active !== false || mealsOf[m.id] > 0 || depOf[m.id] > 0 || paidOf[m.id] > 0
  );
  const buaPerHead = participants.length ? totalBua / participants.length : 0;

  const perMember = {};
  participants.forEach((m) => {
    const mealCost = mealsOf[m.id] * mealRate;
    const totalCost = mealCost + buaPerHead;
    const net = depOf[m.id] + paidOf[m.id] - totalCost;
    perMember[m.id] = {
      deposit: depOf[m.id],
      paid: paidOf[m.id],
      meals: mealsOf[m.id],
      mealCost,
      buaShare: buaPerHead,
      totalCost,
      net,
    };
  });

  const fundCash = totalDeposit - fundPaid;
  return {
    totalDeposit,
    totalBazar,
    totalBua,
    totalMeals,
    mealRate,
    buaPerHead,
    fundCash,
    participants,
    perMember,
    transfers: suggestTransfers(participants, perMember),
    mealDays: mealDays.length,
    avgBazarPerDay: mealDays.length ? totalBazar / mealDays.length : 0,
  };
}

// Greedy "who pays whom" so the number of transactions stays small.
export function suggestTransfers(participants, perMember) {
  const debtors = [];
  const creditors = [];
  participants.forEach((m) => {
    const n = r2(perMember[m.id].net);
    if (n < -0.99) debtors.push({ id: m.id, amt: -n });
    else if (n > 0.99) creditors.push({ id: m.id, amt: n });
  });
  debtors.sort((a, b) => b.amt - a.amt);
  creditors.sort((a, b) => b.amt - a.amt);
  const out = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const x = Math.min(debtors[i].amt, creditors[j].amt);
    if (x > 0.99) out.push({ from: debtors[i].id, to: creditors[j].id, amount: r2(x) });
    debtors[i].amt -= x;
    creditors[j].amt -= x;
    if (debtors[i].amt < 0.99) i++;
    if (creditors[j].amt < 0.99) j++;
  }
  return out;
}

export function monthTotalsForMember(data, month, memberId) {
  const c = computeMonth(data, month);
  return c.perMember[memberId] || null;
}
