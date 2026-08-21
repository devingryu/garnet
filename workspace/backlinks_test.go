package workspace

import (
	"strings"
	"testing"
)

// TestBuildLinkIndex_DedupesRepeatedLinkFromSameSource locks in the fix for
// GARNET-28's dedup bug: a document linking the same target twice (two
// separate markdown links, same href) must count as one backlink source,
// not one per occurrence.
func TestBuildLinkIndex_DedupesRepeatedLinkFromSameSource(t *testing.T) {
	documents := []Document{{Path: "notes/a.md"}}
	issues := []Issue{{ID: "GRNT-1"}}

	root := t.TempDir()
	writeTestFile(t, root, "notes/a.md",
		"See [GRNT-1](../issues/GRNT-1/) and again [here](../issues/GRNT-1/).")

	entries, warnings := buildLinkIndex(root, issues, documents)
	if len(warnings) != 0 {
		t.Fatalf("unexpected warnings: %v", warnings)
	}

	var entry *BacklinkEntry
	for i := range entries {
		if entries[i].TargetKind == "issue" && entries[i].Target == "GRNT-1" {
			entry = &entries[i]
		}
	}
	if entry == nil {
		t.Fatalf("expected a backlink entry for GRNT-1, got %+v", entries)
	}
	if len(entry.Sources) != 1 {
		t.Errorf("expected exactly one deduped source, got %+v", entry.Sources)
	}
}

// TestBuildLinkIndex_WarnsOnDanglingLink is GARNET-28's cheap half: a link
// shaped like a real document reference but pointing at nothing (as if the
// document had been moved or renamed out from under it) surfaces as a
// warning instead of silently dropping out of the backlink index.
func TestBuildLinkIndex_WarnsOnDanglingLink(t *testing.T) {
	documents := []Document{{Path: "notes/a.md"}}

	root := t.TempDir()
	writeTestFile(t, root, "notes/a.md", "See [the old doc](../notes/moved.md).")

	entries, warnings := buildLinkIndex(root, nil, documents)
	if len(entries) != 0 {
		t.Errorf("expected no backlink entries for a dangling target, got %+v", entries)
	}
	if len(warnings) != 1 || !strings.Contains(warnings[0], "notes/moved.md") {
		t.Errorf("expected one warning naming the dangling target, got %v", warnings)
	}
}

// TestBuildLinkIndex_NoWarningForResolvedLink guards against a false
// positive: a link to a document that does exist must not warn.
func TestBuildLinkIndex_NoWarningForResolvedLink(t *testing.T) {
	documents := []Document{{Path: "notes/a.md"}, {Path: "notes/b.md"}}

	root := t.TempDir()
	writeTestFile(t, root, "notes/a.md", "See [b](../notes/b.md).")
	writeTestFile(t, root, "notes/b.md", "")

	_, warnings := buildLinkIndex(root, nil, documents)
	if len(warnings) != 0 {
		t.Errorf("expected no warnings for a link that resolves, got %v", warnings)
	}
}
