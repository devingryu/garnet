package workspace

import (
	"fmt"
	"os"
	"path/filepath"
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

// issueMeta mirrors .garnet.yaml exactly (see ADR 0003).
type issueMeta struct {
	Type     string          `yaml:"type"`
	Status   string          `yaml:"status"`
	Parent   string          `yaml:"parent"`
	Reporter string          `yaml:"reporter"`
	Assignee string          `yaml:"assignee"`
	Links    []Link          `yaml:"links"`
	Timeline []TimelineEntry `yaml:"timeline"`
}

// Issue is one directory under issues/. ID comes from the directory name
// (e.g. "GRNT-1"), not from inside the file — see ADR 0003.
type Issue struct {
	ID          string          `json:"id"`
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

// loadIssue reads .garnet.yaml (required) and issue.md (optional) from dir.
// id is the issue's directory name, used as-is for Issue.ID.
func loadIssue(dir, id string) (*Issue, error) {
	raw, err := os.ReadFile(filepath.Join(dir, ".garnet.yaml"))
	if err != nil {
		return nil, fmt.Errorf("reading .garnet.yaml: %w", err)
	}

	var meta issueMeta
	if err := yaml.Unmarshal(raw, &meta); err != nil {
		return nil, fmt.Errorf("parsing .garnet.yaml: %w", err)
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
