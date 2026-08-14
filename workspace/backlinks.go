package workspace

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
)

// Backlink is one thing linking to a target — see BacklinkEntry.
type Backlink struct {
	Kind string `json:"kind"` // "issue" | "document"
	ID   string `json:"id"`   // issue ID or document path
}

// BacklinkEntry is every known source linking to Target. Derived by
// scanning plain markdown links, never stored — see ADR 0004. A slice
// rather than a map so this type round-trips through the Wails bindings
// exactly like everything else in this codebase.
type BacklinkEntry struct {
	TargetKind string     `json:"targetKind"` // "issue" | "document"
	Target     string     `json:"target"`     // issue ID or document path
	Sources    []Backlink `json:"sources"`
}

var mdLinkRE = regexp.MustCompile(`\[[^\]]*\]\(([^)\s]+)\)`)

// extractLinks returns the URL portion of every markdown link in content.
func extractLinks(content string) []string {
	matches := mdLinkRE.FindAllStringSubmatch(content, -1)
	links := make([]string, 0, len(matches))
	for _, m := range matches {
		links = append(links, m[1])
	}
	return links
}

// resolveLinkTarget resolves link relative to sourceDir (itself relative to
// root) and classifies what it points at. ok is false for anything that
// isn't a recognized internal target — an external URL, a link into
// repos/, an image, or anything else this workspace doesn't track as a
// linkable thing. That's not an error; not every link is backlink-worthy.
func resolveLinkTarget(root, sourceDir, link string) (kind, id string, ok bool) {
	if strings.Contains(link, "://") {
		return "", "", false
	}

	abs := filepath.Clean(filepath.Join(root, sourceDir, filepath.FromSlash(link)))
	rel, err := filepath.Rel(root, abs)
	if err != nil {
		return "", "", false
	}
	rel = filepath.ToSlash(rel)
	if rel == ".." || strings.HasPrefix(rel, "../") {
		return "", "", false
	}

	if rel == "issues" || strings.HasPrefix(rel, "issues/") {
		parts := strings.SplitN(rel, "/", 3)
		if len(parts) >= 2 && parts[1] != "" {
			return "issue", parts[1], true
		}
		return "", "", false
	}

	// A .md file under projects/ or repos/ isn't a browsable Document
	// (ListDocuments excludes those directories too), so it can't be a
	// backlink target either — treat it the same as any other unknown link.
	top := strings.SplitN(rel, "/", 2)[0]
	if reservedTopLevelDirs[top] {
		return "", "", false
	}

	if strings.HasSuffix(rel, ".md") {
		return "document", rel, true
	}

	return "", "", false
}

// buildLinkIndex scans every issue and document for markdown links and
// inverts them into a target -> sources index, plus any warnings from
// documents that couldn't be read (an unreadable issue is already reported
// by the issue scan itself, so only documents need it here).
func buildLinkIndex(root string, issues []Issue, documents []Document) ([]BacklinkEntry, []string) {
	type key struct{ kind, id string }
	index := map[key][]Backlink{}

	addLinks := func(sourceKind, sourceID, sourceDir, content string) {
		for _, link := range extractLinks(content) {
			targetKind, targetID, ok := resolveLinkTarget(root, sourceDir, link)
			if !ok {
				continue
			}
			if targetKind == sourceKind && targetID == sourceID {
				continue // ignore self-links
			}
			k := key{targetKind, targetID}
			index[k] = append(index[k], Backlink{Kind: sourceKind, ID: sourceID})
		}
	}

	for _, issue := range issues {
		addLinks("issue", issue.ID, filepath.Join("issues", issue.ID), issue.Description)
	}

	var warnings []string
	for _, doc := range documents {
		raw, err := os.ReadFile(filepath.Join(root, filepath.FromSlash(doc.Path)))
		if err != nil {
			warnings = append(warnings, fmt.Sprintf("document %q: %v", doc.Path, err))
			continue
		}
		addLinks("document", doc.Path, filepath.Dir(doc.Path), string(raw))
	}

	keys := make([]key, 0, len(index))
	for k := range index {
		keys = append(keys, k)
	}
	sort.Slice(keys, func(i, j int) bool {
		if keys[i].kind != keys[j].kind {
			return keys[i].kind < keys[j].kind
		}
		return keys[i].id < keys[j].id
	})

	entries := make([]BacklinkEntry, 0, len(keys))
	for _, k := range keys {
		sources := index[k]
		sort.Slice(sources, func(i, j int) bool {
			if sources[i].Kind != sources[j].Kind {
				return sources[i].Kind < sources[j].Kind
			}
			return sources[i].ID < sources[j].ID
		})
		entries = append(entries, BacklinkEntry{TargetKind: k.kind, Target: k.id, Sources: sources})
	}

	return entries, warnings
}
