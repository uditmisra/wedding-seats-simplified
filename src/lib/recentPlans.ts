const KEY = "lovable-seats-recent";

export interface RecentPlan {
  code: string;
  name: string;
  openedAt: number;
}

export function getRecentPlans(): RecentPlan[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as RecentPlan[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function addRecentPlan(p: RecentPlan) {
  const list = getRecentPlans().filter(x => x.code !== p.code);
  list.unshift(p);
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 10)));
}

export function removeRecentPlan(code: string) {
  const list = getRecentPlans().filter(x => x.code !== code);
  localStorage.setItem(KEY, JSON.stringify(list));
}