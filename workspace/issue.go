package workspace

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

// Link is a typed relation to another issue, e.g. "blocks" GRNT-5.
type Link struct {
	Type   string `yaml:"type" json:"type"`
	Target string `yaml:"target" json:"target"`
}

// TimelineEntry is one append-only record in an issue's timeline. Fields not
// relevant to a given Kind are simply empty — this is a single loose shape
// covering both automatic status-change entries and manual notes, per
// ADR 0006.
type TimelineEntry struct {
	At   time.Time `yaml:"at" json:"at"`
	By   string    `yaml:"by" json:"by"`
	Kind string    `yaml:"kind" json:"kind"`
	From string    `yaml:"from,omitempty" json:"from,omitempty"`
	To   string    `yaml:"to,omitempty" json:"to,omitempty"`
	Body string    `yaml:"body,omitempty" json:"body,omitempty"`
}

// issueMeta mirrors .garnet.yaml exactly (see ADR 0003). Timeline is kept
// last so appends land at the end of the file (diff/merge-conflict
// minimization, per ADR 0003) — this field order is load-bearing, not
// cosmetic, since yaml.v3 marshals struct fields in declaration order.
type issueMeta struct {
	Title    string          `yaml:"title"`
	Type     string          `yaml:"type"`
	Status   string          `yaml:"status"`
	Parent   string          `yaml:"parent"`
	Reporter string          `yaml:"reporter"`
	Assignee string          `yaml:"assignee"`
	Links    []Link          `yaml:"links"`
	Timeline []TimelineEntry `yaml:"timeline"`
}

// Issue is one directory under issues/. ID comes from the directory name
// (e.g. "GRNT-1"), not from inside the file — see ADR 0003. Title is
// structured metadata in .garnet.yaml, not parsed out of issue.md — the
// body stays free-form markdown, not a source of identity.
type Issue struct {
	ID string `json:"id"`
	// ProjectKey is derived from ID (the part before the last "-"), not
	// stored in .garnet.yaml — project keys never contain hyphens, so this
	// split is unambiguous.
	ProjectKey  string          `json:"projectKey"`
	Title       string          `json:"title"`
	Type        string          `json:"type"`
	Status      string          `json:"status"`
	Parent      string          `json:"parent,omitempty"`
	Reporter    string          `json:"reporter,omitempty"`
	Assignee    string          `json:"assignee,omitempty"`
	Links       []Link          `json:"links"`
	Timeline    []TimelineEntry `json:"timeline"`
	Description string          `json:"description"`
	// Documents lists filenames in the issue directory other than
	// .garnet.yaml and issue.md — attached docs are not parsed until M4.
	Documents []string `json:"documents"`
}

var ErrIssueNotFound = errors.New("issue not found")

// projectKeyFromID returns the project key portion of an issue ID, e.g.
// "GRNT-1" -> "GRNT".
func projectKeyFromID(id string) string {
	if i := strings.LastIndex(id, "-"); i != -1 {
		return id[:i]
	}
	return id
}

// readIssueMeta reads and parses .garnet.yaml from dir.
func readIssueMeta(dir string) (issueMeta, error) {
	raw, err := os.ReadFile(filepath.Join(dir, ".garnet.yaml"))
	if os.IsNotExist(err) {
		return issueMeta{}, ErrIssueNotFound
	}
	if err != nil {
		return issueMeta{}, fmt.Errorf("reading .garnet.yaml: %w", err)
	}

	var meta issueMeta
	if err := yaml.Unmarshal(raw, &meta); err != nil {
		return issueMeta{}, fmt.Errorf("parsing .garnet.yaml: %w", err)
	}
	return meta, nil
}

// writeIssueMeta marshals meta and writes it to dir/.garnet.yaml.
func writeIssueMeta(dir string, meta issueMeta) error {
	data, err := yaml.Marshal(meta)
	if err != nil {
		return fmt.Errorf("encoding .garnet.yaml: %w", err)
	}
	return writeFile(filepath.Join(dir, ".garnet.yaml"), data)
}

// loadIssue reads .garnet.yaml (required) and issue.md (optional) from dir.
// id is the issue's directory name, used as-is for Issue.ID.
func loadIssue(dir, id string) (*Issue, error) {
	meta, err := readIssueMeta(dir)
	if err != nil {
		return nil, err
	}

	description := ""
	if body, err := os.ReadFile(filepath.Join(dir, "issue.md")); err == nil {
		description = string(body)
	} else if !os.IsNotExist(err) {
		return nil, fmt.Errorf("reading issue.md: %w", err)
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("listing issue directory: %w", err)
	}
	documents := []string{}
	for _, e := range entries {
		name := e.Name()
		if e.IsDir() || name == ".garnet.yaml" || name == "issue.md" {
			continue
		}
		documents = append(documents, name)
	}

	links := meta.Links
	if links == nil {
		links = []Link{}
	}
	timeline := meta.Timeline
	if timeline == nil {
		timeline = []TimelineEntry{}
	}

	return &Issue{
		ID:          id,
		ProjectKey:  projectKeyFromID(id),
		Title:       meta.Title,
		Type:        meta.Type,
		Status:      meta.Status,
		Parent:      meta.Parent,
		Reporter:    meta.Reporter,
		Assignee:    meta.Assignee,
		Links:       links,
		Timeline:    timeline,
		Description: description,
		Documents:   documents,
	}, nil
}

// nextIssueID scans issues/ for existing "<projectKey>-<n>" directories and
// returns the next one in sequence, starting at 1.
func nextIssueID(root, projectKey string) (string, error) {
	names, err := subdirNames(filepath.Join(root, "issues"))
	if err != nil && !os.IsNotExist(err) {
		return "", err
	}

	max := 0
	prefix := projectKey + "-"
	for _, name := range names {
		if !strings.HasPrefix(name, prefix) {
			continue
		}
		n, err := strconv.Atoi(strings.TrimPrefix(name, prefix))
		if err != nil {
			continue // not a well-formed ID; ignore rather than fail the scan
		}
		if n > max {
			max = n
		}
	}
	return fmt.Sprintf("%s-%d", projectKey, max+1), nil
}

// CreateIssue creates a new issue under the given project. It requires an
// identity to be configured (see Identity) to record a reporter.
func CreateIssue(root, projectKey, issueType, title string) (*Issue, error) {
	if strings.TrimSpace(title) == "" {
		return nil, errors.New("title is required")
	}

	project, err := loadProject(filepath.Join(root, "projects", projectKey))
	if err != nil {
		return nil, fmt.Errorf("loading project %q: %w", projectKey, err)
	}
	if len(project.IssueTypes) > 0 && !contains(project.IssueTypes, issueType) {
		return nil, fmt.Errorf("issue type %q is not declared by project %q", issueType, projectKey)
	}

	identity, err := LoadIdentity(root)
	if err != nil {
		return nil, fmt.Errorf("loading identity: %w", err)
	}
	if identity == nil {
		return nil, errors.New("no identity configured for this workspace — set one up before creating issues")
	}

	id, err := nextIssueID(root, projectKey)
	if err != nil {
		return nil, fmt.Errorf("assigning issue ID: %w", err)
	}

	initialStatus := ""
	if project.Workflow != nil && len(project.Workflow.Statuses) > 0 {
		initialStatus = project.Workflow.Statuses[0].ID
	}

	dir := filepath.Join(root, "issues", id)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("creating issue directory: %w", err)
	}
	if err := writeFile(filepath.Join(dir, "issue.md"), []byte{}); err != nil {
		return nil, fmt.Errorf("creating issue.md: %w", err)
	}

	meta := issueMeta{
		Title:    title,
		Type:     issueType,
		Status:   initialStatus,
		Reporter: identity.Email,
		Links:    []Link{},
		Timeline: []TimelineEntry{},
	}
	if err := writeIssueMeta(dir, meta); err != nil {
		return nil, err
	}

	return loadIssue(dir, id)
}

// UpdateIssueBody overwrites issue.md for the given issue.
func UpdateIssueBody(root, issueID, body string) error {
	dir := filepath.Join(root, "issues", issueID)
	if _, err := readIssueMeta(dir); err != nil {
		return err
	}
	return writeFile(filepath.Join(dir, "issue.md"), []byte(body))
}

// SetIssueTitle renames an issue. Title is required — an issue is never
// left titleless.
func SetIssueTitle(root, issueID, title string) (*Issue, error) {
	if strings.TrimSpace(title) == "" {
		return nil, errors.New("title is required")
	}
	dir := filepath.Join(root, "issues", issueID)
	meta, err := readIssueMeta(dir)
	if err != nil {
		return nil, err
	}
	meta.Title = title
	if err := writeIssueMeta(dir, meta); err != nil {
		return nil, err
	}
	return loadIssue(dir, issueID)
}

// TransitionIssueStatus moves an issue to newStatus. If the issue's project
// declares a workflow, the transition must be allowed by it; a project with
// no workflow can't be validated against, so any status is accepted. This
// does not append a timeline entry — that's M3's job (ADR 0006 scope).
func TransitionIssueStatus(root, issueID, newStatus string) (*Issue, error) {
	dir := filepath.Join(root, "issues", issueID)
	meta, err := readIssueMeta(dir)
	if err != nil {
		return nil, err
	}

	if project, err := loadProject(filepath.Join(root, "projects", projectKeyFromID(issueID))); err == nil && project.Workflow != nil {
		if err := validateTransition(project.Workflow, meta.Status, newStatus); err != nil {
			return nil, err
		}
	}

	meta.Status = newStatus
	if err := writeIssueMeta(dir, meta); err != nil {
		return nil, err
	}
	return loadIssue(dir, issueID)
}

func validateTransition(wf *Workflow, from, to string) error {
	validStatus := false
	for _, s := range wf.Statuses {
		if s.ID == to {
			validStatus = true
			break
		}
	}
	if !validStatus {
		return fmt.Errorf("%q is not a status declared by this project's workflow", to)
	}

	for _, t := range wf.Transitions {
		if t.From != from {
			continue
		}
		if contains(t.To, to) {
			return nil
		}
	}
	return fmt.Errorf("invalid transition from %q to %q", from, to)
}

// SetIssueAssignee sets the assignee (an email, per ADR 0005) on an issue.
// If the issue's project declares members, the assignee must be one of
// them — an unregistered person can't be assigned, though they can still be
// a reporter (reporter comes from Identity, not from this restricted list).
func SetIssueAssignee(root, issueID, email string) (*Issue, error) {
	dir := filepath.Join(root, "issues", issueID)
	meta, err := readIssueMeta(dir)
	if err != nil {
		return nil, err
	}

	if email != "" {
		if project, err := loadProject(filepath.Join(root, "projects", projectKeyFromID(issueID))); err == nil && len(project.Members) > 0 {
			if !isMember(project.Members, email) {
				return nil, fmt.Errorf("%q is not a registered member of project %q", email, project.Key)
			}
		}
	}

	meta.Assignee = email
	if err := writeIssueMeta(dir, meta); err != nil {
		return nil, err
	}
	return loadIssue(dir, issueID)
}

// SetIssueParent sets an issue's parent. parentID must refer to an existing
// issue; cycle detection is not implemented in v1.
func SetIssueParent(root, issueID, parentID string) (*Issue, error) {
	dir := filepath.Join(root, "issues", issueID)
	meta, err := readIssueMeta(dir)
	if err != nil {
		return nil, err
	}
	if parentID != "" {
		if _, err := readIssueMeta(filepath.Join(root, "issues", parentID)); err != nil {
			return nil, fmt.Errorf("parent %q: %w", parentID, err)
		}
	}
	meta.Parent = parentID
	if err := writeIssueMeta(dir, meta); err != nil {
		return nil, err
	}
	return loadIssue(dir, issueID)
}

// AddIssueLink appends a typed link to another issue. target must refer to
// an existing issue.
func AddIssueLink(root, issueID, linkType, target string) (*Issue, error) {
	dir := filepath.Join(root, "issues", issueID)
	meta, err := readIssueMeta(dir)
	if err != nil {
		return nil, err
	}
	if _, err := readIssueMeta(filepath.Join(root, "issues", target)); err != nil {
		return nil, fmt.Errorf("link target %q: %w", target, err)
	}
	meta.Links = append(meta.Links, Link{Type: linkType, Target: target})
	if err := writeIssueMeta(dir, meta); err != nil {
		return nil, err
	}
	return loadIssue(dir, issueID)
}

func contains(list []string, s string) bool {
	for _, v := range list {
		if v == s {
			return true
		}
	}
	return false
}

func isMember(members []Member, email string) bool {
	for _, m := range members {
		if m.Email == email {
			return true
		}
	}
	return false
}
