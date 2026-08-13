package workspace

import (
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

// Repo is a code repository declared by a project, to be cloned into repos/.
// Cloning itself is out of scope until M5 — this only carries the declaration.
type Repo struct {
	URL  string `yaml:"url" json:"url"`
	Path string `yaml:"path" json:"path"`
}

// Project is parsed from projects/<KEY>/project.md (+ sibling workflow.md).
type Project struct {
	Key         string    `yaml:"key" json:"key"`
	Name        string    `yaml:"name" json:"name"`
	Repos       []Repo    `yaml:"repos" json:"repos"`
	IssueTypes  []string  `yaml:"issue-types" json:"issueTypes"`
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

	workflow, err := loadWorkflow(dir)
	if err != nil {
		return nil, fmt.Errorf("parsing workflow.md: %w", err)
	}
	p.Workflow = workflow

	return &p, nil
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
