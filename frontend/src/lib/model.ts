import type {workspace} from '../../wailsjs/go/models';

// `any` short-circuits conditional types into a union of both branches, which
// would collapse Plain<T> for TimelineEntry.at (Wails types time.Time as any).
type IsAny<T> = 0 extends 1 & T ? true : false;

/**
 * Wails generates classes, not interfaces: every model carries a
 * `convertValues` method, so an object literal never satisfies one. Plain<T>
 * is the same data without the method — the shape application state actually
 * holds. Casting with `as workspace.X` would silence the mismatch instead of
 * resolving it, and that is how a stale-derived-data bug once hid here
 * (AGENTS.md rule 4).
 */
export type Plain<T> =
    IsAny<T> extends true
        ? T
        : T extends (infer U)[]
          ? Plain<U>[]
          : T extends object
            ? {[K in keyof Omit<T, 'convertValues'>]: Plain<T[K]>}
            : T;

export type Workspace = Plain<workspace.Workspace>;
export type Project = Plain<workspace.Project>;
export type Issue = Plain<workspace.Issue>;
export type Document = Plain<workspace.Document>;
export type Identity = Plain<workspace.Identity>;
export type Workflow = Plain<workspace.Workflow>;
export type Status = Plain<workspace.Status>;
export type Transition = Plain<workspace.Transition>;
export type Backlink = Plain<workspace.Backlink>;
export type CloneResult = Plain<workspace.CloneResult>;
export type TimelineEntry = Plain<workspace.TimelineEntry>;
export type TodoItem = Plain<workspace.TodoItem>;
export type RecentWorkspace = Plain<workspace.RecentWorkspace>;

/** A workspace and the path it was read from. They are set together and
 *  cleared together, so they are one value — not two states plus a `!`
 *  assertion at every call site (AGENTS.md rule 5). */
export interface LoadedWorkspace {
    path: string;
    data: Workspace;
}
