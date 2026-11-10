import type { Action, Goal, Member } from './types';

/** tap-receipts-everywhere §9.3: the placeholder a reasons point may carry; the act page fills it with the goal's leader. */
export const LEADER = '{{leader}}';

/**
 * §9.3: the goal's leader name: the `incumbents` of its first action's script blocks (`leadership.yaml`) filtered to
 * the action's chamber (`target_scope` house | senate; both and state resolve nothing), named from the members rows.
 * No model, no request: the same goal always fills the same name, the one `leaderLine` (generate.ts) uses.
 */
export function leaderName(goal: Pick<Goal, 'id'>, actions: readonly Action[], members: readonly Pick<Member, 'bioguide_id' | 'chamber' | 'name'>[]): string | null {
  const a = actions.filter((x) => x.goal_id === goal.id).sort((x, y) => x.order - y.order)[0];
  if (!a?.script_blocks || (a.target_scope !== 'house' && a.target_scope !== 'senate')) return null;
  const raw = JSON.parse(a.script_blocks) as { incumbents?: unknown };
  const ids = Array.isArray(raw.incumbents) ? raw.incumbents.filter((x): x is string => typeof x === 'string') : [];
  return members.find((m) => ids.includes(m.bioguide_id) && m.chamber === a.target_scope)?.name ?? null;
}

/** A point with every `{{leader}}` replaced by the name; unchanged when the goal has no leader. */
export function fillLeader(text: string, name: string | null): string {
  return name === null ? text : text.split(LEADER).join(name);
}
