package workspace

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"gopkg.in/yaml.v3"
)

// Repo is a code repository declared by a project, to be cloned into repos/.
// Cloning itself is out of scope until M5 — this only carries the declaration.
type Repo struct {
	URL  string `yaml:"url" json:"url"`
	Path string `yaml:"path" json:"path"`
}

// Member is a person registered against a project — the closed list that
// Assignee is restricted to (Reporter is set from Identity at creation, so
// it doesn't need this). Shape matches Identity's name+email pair; there
// are no roles/permissions modeled yet.
type Member struct {
	Name  string `yaml:"name" json:"name"`
	Email string `yaml:"email" json:"email"`
}

// Project is parsed from projects/<KEY>/project.md (+ sibling workflow.md).
type Project struct {
	Key        string   `yaml:"key" json:"key"`
	Name       string   `yaml:"name" json:"name"`
	Repos      []Repo   `yaml:"repos" json:"repos"`
	IssueTypes []string `yaml:"issue-types" json:"issueTypes"`
	Members    []Member `yaml:"members" json:"members"`
	// Archived hides a project from the default project switcher without
	// deleting anything — see M5's decision to prefer archive over delete.
	Archived    bool      `yaml:"archived,omitempty" json:"archived"`
	Description string    `yaml:"-" json:"description"`
	Workflow    *Workflow `yaml:"-" json:"workflow"`
}

// Status is one entry in a project's workflow.
type Status struct {
	ID       string `yaml:"id" json:"id"`
	Name     string `yaml:"name" json:"name"`
	Category string `yaml:"category" json:"category"`
}

// Transition declares which statuses an issue may move to from a given status.
type Transition struct {
	From string   `yaml:"from" json:"from"`
	To   []string `yaml:"to" json:"to"`
}

// Workflow is parsed from projects/<KEY>/workflow.md.
type Workflow struct {
	Statuses    []Status     `yaml:"statuses" json:"statuses"`
	Transitions []Transition `yaml:"transitions" json:"transitions"`
}

// loadProject reads project.md (required) and workflow.md (optional) from dir.
func loadProject(dir string) (*Project, error) {
	raw, err := os.ReadFile(filepath.Join(dir, "project.md"))
	if err != nil {
		return nil, fmt.Errorf("reading project.md: %w", err)
	}

	fm, body, err := splitFrontmatter(raw)
	if err != nil {
		return nil, fmt.Errorf("parsing project.md: %w", err)
	}

	var p Project
	if err := yaml.Unmarshal(fm, &p); err != nil {
		return nil, fmt.Errorf("parsing project.md frontmatter: %w", err)
	}
	p.Description = body
	// Non-nil so these marshal to JSON `[]` rather than `null`.
	if p.Repos == nil {
		p.Repos = []Repo{}
	}
	if p.IssueTypes == nil {
		p.IssueTypes = []string{}
	}
	if p.Members == nil {
		p.Members = []Member{}
	}

	workflow, err := loadWorkflow(dir)
	if err != nil {
		return nil, fmt.Errorf("parsing workflow.md: %w", err)
	}
	p.Workflow = workflow

	return &p, nil
}

// writeProjectFrontmatter marshals p's frontmatter fields (everything except
// Description/Workflow, which are tagged yaml:"-") and reassembles project.md
// around the existing Description body via joinFrontmatter, preserving it.
func writeProjectFrontmatter(dir string, p *Project) error {
	fm, err := yaml.Marshal(p)
	if err != nil {
		return fmt.Errorf("encoding project.md: %w", err)
	}
	return writeFile(filepath.Join(dir, "project.md"), joinFrontmatter(fm, p.Description))
}

// projectKeyRE restricts a project key to letters, digits, and underscores:
// no "-" (issue IDs split on the last hyphen to recover the project key —
// see projectKeyFromID — so a hyphen in the key itself would make that
// ambiguous), and nothing that could act as a path separator, since the key
// becomes projects/<key> directly on disk.
var projectKeyRE = regexp.MustCompile(`^[A-Za-z0-9_]+$`)

// CreateProject declares a new project at projects/<key>/project.md, with no
// repos, issue types, or members yet — those are added afterward via
// AddProjectRepo, SetProjectIssueTypes, and AddProjectMember.
func CreateProject(root, key, name string) (*Project, error) {
	if strings.TrimSpace(key) == "" {
		return nil, errProjectKeyRequired()
	}
	if !projectKeyRE.MatchString(key) {
		return nil, errProjectKeyInvalid(key)
	}
	if strings.TrimSpace(name) == "" {
		return nil, errProjectNameRequired()
	}

	dir := filepath.Join(root, "projects", key)
	if dirExists(dir) {
		return nil, errProjectAlreadyExists(key)
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("creating project directory: %w", err)
	}

	project := &Project{
		Key:        key,
		Name:       name,
		Repos:      []Repo{},
		IssueTypes: []string{},
		Members:    []Member{},
	}
	if err := writeProjectFrontmatter(dir, project); err != nil {
		return nil, err
	}
	return loadProject(dir)
}

// AddProjectMember registers a person against a project, restricting who can
// be assigned issues in it (see SetIssueAssignee). This is a narrow slice of
// the project-definition editing that's fully scoped for M5 — just enough
// to make membership-restricted assignment usable now.
func AddProjectMember(root, projectKey, name, email string) (*Project, error) {
	dir := filepath.Join(root, "projects", projectKey)
	project, err := loadProject(dir)
	if err != nil {
		return nil, errProjectLoadFailed(projectKey, err)
	}

	for _, m := range project.Members {
		if m.Email == email {
			return nil, errMemberAlreadyExists(email, projectKey)
		}
	}
	project.Members = append(project.Members, Member{Name: name, Email: email})

	if err := writeProjectFrontmatter(dir, project); err != nil {
		return nil, err
	}
	return loadProject(dir)
}

// SetProjectIssueTypes replaces a project's declared issue types wholesale —
// the editor UI always resends the full list, so there's no partial update
// to reconcile.
func SetProjectIssueTypes(root, projectKey string, types []string) (*Project, error) {
	dir := filepath.Join(root, "projects", projectKey)
	project, err := loadProject(dir)
	if err != nil {
		return nil, errProjectLoadFailed(projectKey, err)
	}

	project.IssueTypes = types
	if project.IssueTypes == nil {
		project.IssueTypes = []string{}
	}

	if err := writeProjectFrontmatter(dir, project); err != nil {
		return nil, err
	}
	return loadProject(dir)
}

// SetWorkflow replaces a project's workflow.md wholesale, after checking
// every transition only references declared statuses.
func SetWorkflow(root, projectKey string, statuses []Status, transitions []Transition) (*Project, error) {
	dir := filepath.Join(root, "projects", projectKey)
	if _, err := loadProject(dir); err != nil {
		return nil, errProjectLoadFailed(projectKey, err)
	}

	ids := map[string]bool{}
	for _, s := range statuses {
		ids[s.ID] = true
	}
	for _, t := range transitions {
		if !ids[t.From] {
			return nil, errTransitionUnknownStatus(t.From)
		}
		for _, to := range t.To {
			if !ids[to] {
				return nil, errTransitionUnknownStatus(to)
			}
		}
	}

	wf := Workflow{Statuses: statuses, Transitions: transitions}
	fm, err := yaml.Marshal(wf)
	if err != nil {
		return nil, fmt.Errorf("encoding workflow.md: %w", err)
	}
	if err := writeFile(filepath.Join(dir, "workflow.md"), joinFrontmatter(fm, "")); err != nil {
		return nil, err
	}
	return loadProject(dir)
}

// ArchiveProject and UnarchiveProject flip Project.Archived. Archiving
// hides a project from the default switcher without deleting anything —
// see M5's decision to prefer archive over delete.
func ArchiveProject(root, projectKey string) (*Project, error) {
	return setProjectArchived(root, projectKey, true)
}

func UnarchiveProject(root, projectKey string) (*Project, error) {
	return setProjectArchived(root, projectKey, false)
}

func setProjectArchived(root, projectKey string, archived bool) (*Project, error) {
	dir := filepath.Join(root, "projects", projectKey)
	project, err := loadProject(dir)
	if err != nil {
		return nil, errProjectLoadFailed(projectKey, err)
	}
	project.Archived = archived
	if err := writeProjectFrontmatter(dir, project); err != nil {
		return nil, err
	}
	return loadProject(dir)
}

// AddProjectRepo declares a code repository for a project — cloning it is
// CloneProjectRepos's job (workspace/repos.go), not this one.
func AddProjectRepo(root, projectKey, url, path string) (*Project, error) {
	dir := filepath.Join(root, "projects", projectKey)
	project, err := loadProject(dir)
	if err != nil {
		return nil, errProjectLoadFailed(projectKey, err)
	}

	for _, r := range project.Repos {
		if r.Path == path {
			return nil, errRepoPathTaken(path)
		}
	}
	project.Repos = append(project.Repos, Repo{URL: url, Path: path})

	if err := writeProjectFrontmatter(dir, project); err != nil {
		return nil, err
	}
	return loadProject(dir)
}

// RemoveProjectRepo un-declares a repo. It does not delete anything already
// cloned under repos/ — that's left alone.
func RemoveProjectRepo(root, projectKey, path string) (*Project, error) {
	dir := filepath.Join(root, "projects", projectKey)
	project, err := loadProject(dir)
	if err != nil {
		return nil, errProjectLoadFailed(projectKey, err)
	}

	found := false
	kept := make([]Repo, 0, len(project.Repos))
	for _, r := range project.Repos {
		if r.Path == path {
			found = true
			continue
		}
		kept = append(kept, r)
	}
	if !found {
		return nil, errRepoNotDeclared(path)
	}
	project.Repos = kept

	if err := writeProjectFrontmatter(dir, project); err != nil {
		return nil, err
	}
	return loadProject(dir)
}

// loadWorkflow reads workflow.md from dir. A missing file is not an error —
// not every project defines a workflow yet.
func loadWorkflow(dir string) (*Workflow, error) {
	raw, err := os.ReadFile(filepath.Join(dir, "workflow.md"))
	if os.IsNotExist(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	fm, _, err := splitFrontmatter(raw)
	if err != nil {
		return nil, err
	}

	var w Workflow
	if err := yaml.Unmarshal(fm, &w); err != nil {
		return nil, err
	}
	if w.Statuses == nil {
		w.Statuses = []Status{}
	}
	if w.Transitions == nil {
		w.Transitions = []Transition{}
	}
	return &w, nil
}
