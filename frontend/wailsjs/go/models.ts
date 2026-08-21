export namespace workspace {
	
	export class Backlink {
	    kind: string;
	    id: string;
	
	    static createFrom(source: any = {}) {
	        return new Backlink(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.kind = source["kind"];
	        this.id = source["id"];
	    }
	}
	export class BacklinkEntry {
	    targetKind: string;
	    target: string;
	    sources: Backlink[];
	
	    static createFrom(source: any = {}) {
	        return new BacklinkEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.targetKind = source["targetKind"];
	        this.target = source["target"];
	        this.sources = this.convertValues(source["sources"], Backlink);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class CloneResult {
	    cloned: string[];
	    warnings: string[];
	
	    static createFrom(source: any = {}) {
	        return new CloneResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.cloned = source["cloned"];
	        this.warnings = source["warnings"];
	    }
	}
	export class Document {
	    path: string;
	
	    static createFrom(source: any = {}) {
	        return new Document(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	    }
	}
	export class GitFileChange {
	    path: string;
	    status: string;
	    origPath?: string;
	
	    static createFrom(source: any = {}) {
	        return new GitFileChange(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.status = source["status"];
	        this.origPath = source["origPath"];
	    }
	}
	export class GitStatus {
	    branch: string;
	    hasUpstream: boolean;
	    ahead: number;
	    behind: number;
	    staged: GitFileChange[];
	    unstaged: GitFileChange[];
	
	    static createFrom(source: any = {}) {
	        return new GitStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.branch = source["branch"];
	        this.hasUpstream = source["hasUpstream"];
	        this.ahead = source["ahead"];
	        this.behind = source["behind"];
	        this.staged = this.convertValues(source["staged"], GitFileChange);
	        this.unstaged = this.convertValues(source["unstaged"], GitFileChange);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Identity {
	    name: string;
	    email: string;
	
	    static createFrom(source: any = {}) {
	        return new Identity(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.email = source["email"];
	    }
	}
	export class TodoItem {
	    line: number;
	    text: string;
	    done: boolean;
	
	    static createFrom(source: any = {}) {
	        return new TodoItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.line = source["line"];
	        this.text = source["text"];
	        this.done = source["done"];
	    }
	}
	export class TimelineEntry {
	    // Go type: time
	    at: any;
	    by: string;
	    kind: string;
	    from?: string;
	    to?: string;
	    body?: string;
	
	    static createFrom(source: any = {}) {
	        return new TimelineEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.at = this.convertValues(source["at"], null);
	        this.by = source["by"];
	        this.kind = source["kind"];
	        this.from = source["from"];
	        this.to = source["to"];
	        this.body = source["body"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Link {
	    type: string;
	    target: string;
	
	    static createFrom(source: any = {}) {
	        return new Link(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.type = source["type"];
	        this.target = source["target"];
	    }
	}
	export class Issue {
	    id: string;
	    projectKey: string;
	    title: string;
	    type: string;
	    status: string;
	    priority?: string;
	    parent?: string;
	    reporter?: string;
	    assignee?: string;
	    links: Link[];
	    timeline: TimelineEntry[];
	    description: string;
	    documents: string[];
	    todos: TodoItem[];
	    children: string[];
	
	    static createFrom(source: any = {}) {
	        return new Issue(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.projectKey = source["projectKey"];
	        this.title = source["title"];
	        this.type = source["type"];
	        this.status = source["status"];
	        this.priority = source["priority"];
	        this.parent = source["parent"];
	        this.reporter = source["reporter"];
	        this.assignee = source["assignee"];
	        this.links = this.convertValues(source["links"], Link);
	        this.timeline = this.convertValues(source["timeline"], TimelineEntry);
	        this.description = source["description"];
	        this.documents = source["documents"];
	        this.todos = this.convertValues(source["todos"], TodoItem);
	        this.children = source["children"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class Member {
	    name: string;
	    email: string;
	
	    static createFrom(source: any = {}) {
	        return new Member(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.email = source["email"];
	    }
	}
	export class Profile {
	    name: string;
	    email: string;
	
	    static createFrom(source: any = {}) {
	        return new Profile(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.email = source["email"];
	    }
	}
	export class Transition {
	    from: string;
	    to: string[];
	
	    static createFrom(source: any = {}) {
	        return new Transition(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.from = source["from"];
	        this.to = source["to"];
	    }
	}
	export class Status {
	    id: string;
	    name: string;
	    category: string;
	
	    static createFrom(source: any = {}) {
	        return new Status(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.category = source["category"];
	    }
	}
	export class Workflow {
	    statuses: Status[];
	    transitions: Transition[];
	
	    static createFrom(source: any = {}) {
	        return new Workflow(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.statuses = this.convertValues(source["statuses"], Status);
	        this.transitions = this.convertValues(source["transitions"], Transition);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Repo {
	    url: string;
	    path: string;
	
	    static createFrom(source: any = {}) {
	        return new Repo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.url = source["url"];
	        this.path = source["path"];
	    }
	}
	export class Project {
	    key: string;
	    name: string;
	    repos: Repo[];
	    issueTypes: string[];
	    members: Member[];
	    archived: boolean;
	    description: string;
	    workflow?: Workflow;
	
	    static createFrom(source: any = {}) {
	        return new Project(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.key = source["key"];
	        this.name = source["name"];
	        this.repos = this.convertValues(source["repos"], Repo);
	        this.issueTypes = source["issueTypes"];
	        this.members = this.convertValues(source["members"], Member);
	        this.archived = source["archived"];
	        this.description = source["description"];
	        this.workflow = this.convertValues(source["workflow"], Workflow);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class RecentWorkspace {
	    path: string;
	    // Go type: time
	    lastOpened: any;
	
	    static createFrom(source: any = {}) {
	        return new RecentWorkspace(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.lastOpened = this.convertValues(source["lastOpened"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	
	
	
	export class User {
	    email: string;
	    name: string;
	    github: string;
	    atlassian: string;
	
	    static createFrom(source: any = {}) {
	        return new User(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.email = source["email"];
	        this.name = source["name"];
	        this.github = source["github"];
	        this.atlassian = source["atlassian"];
	    }
	}
	
	export class Workspace {
	    root: string;
	    projects: Project[];
	    issues: Issue[];
	    documents: Document[];
	    backlinks: BacklinkEntry[];
	    warnings: string[];
	
	    static createFrom(source: any = {}) {
	        return new Workspace(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.root = source["root"];
	        this.projects = this.convertValues(source["projects"], Project);
	        this.issues = this.convertValues(source["issues"], Issue);
	        this.documents = this.convertValues(source["documents"], Document);
	        this.backlinks = this.convertValues(source["backlinks"], BacklinkEntry);
	        this.warnings = source["warnings"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

