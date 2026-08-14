package workspace

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestListDocuments(t *testing.T) {
	docs, err := ListDocuments("testdata/valid")
	if err != nil {
		t.Fatalf("ListDocuments() returned error: %v", err)
	}

	var paths []string
	for _, d := range docs {
		paths = append(paths, d.Path)
	}

	if !contains(paths, "decisions/0001-test-decision.md") {
		t.Errorf("expected decisions/0001-test-decision.md in %v", paths)
	}
	for _, p := range paths {
		if strings.HasPrefix(p, "issues/") || strings.HasPrefix(p, "projects/") {
			t.Errorf("expected issues/ and projects/ to be excluded, found %q", p)
		}
	}
}

func TestReadWriteDocument_RoundTrip(t *testing.T) {
	root := copyFixture(t, "valid")

	if err := WriteDocument(root, "decisions/0002-new.md", "# New\n\nBody.\n"); err != nil {
		t.Fatalf("WriteDocument() returned error: %v", err)
	}

	content, err := ReadDocument(root, "decisions/0002-new.md")
	if err != nil {
		t.Fatalf("ReadDocument() returned error: %v", err)
	}
	if !strings.Contains(content, "Body.") {
		t.Errorf("unexpected content: %q", content)
	}
}

func TestWriteDocument_CreatesParentDirectory(t *testing.T) {
	root := copyFixture(t, "valid")

	if err := WriteDocument(root, "specs/new-area/spec.md", "content"); err != nil {
		t.Fatalf("WriteDocument() returned error: %v", err)
	}
	if _, err := os.Stat(filepath.Join(root, "specs", "new-area", "spec.md")); err != nil {
		t.Errorf("expected file to exist: %v", err)
	}
}

func TestWriteDocument_RejectsPathTraversal(t *testing.T) {
	root := copyFixture(t, "valid")
	if err := WriteDocument(root, "../outside.md", "content"); err == nil {
		t.Fatal("expected an error for a path escaping the workspace, got nil")
	}
}

func TestWriteDocument_RejectsReservedDirs(t *testing.T) {
	root := copyFixture(t, "valid")
	if err := WriteDocument(root, "issues/GRNT-1/sneaky.md", "content"); err == nil {
		t.Fatal("expected an error for a path under a reserved directory, got nil")
	}
}

func TestWriteDocument_RejectsNonMarkdown(t *testing.T) {
	root := copyFixture(t, "valid")
	if err := WriteDocument(root, "decisions/not-markdown.txt", "content"); err == nil {
		t.Fatal("expected an error for a non-.md path, got nil")
	}
}

func TestReadDocument_NotFound(t *testing.T) {
	root := copyFixture(t, "valid")
	if _, err := ReadDocument(root, "decisions/does-not-exist.md"); err == nil {
		t.Fatal("expected an error for a nonexistent document, got nil")
	}
}

func TestOpen_BacklinksBothDirections(t *testing.T) {
	ws, err := Open("testdata/valid")
	if err != nil {
		t.Fatalf("Open() returned error: %v", err)
	}

	if len(ws.Documents) != 1 || ws.Documents[0].Path != "decisions/0001-test-decision.md" {
		t.Fatalf("unexpected documents: %+v", ws.Documents)
	}

	var issueBacklink, docBacklink *BacklinkEntry
	for i := range ws.Backlinks {
		e := &ws.Backlinks[i]
		if e.TargetKind == "issue" && e.Target == "GRNT-1" {
			issueBacklink = e
		}
		if e.TargetKind == "document" && e.Target == "decisions/0001-test-decision.md" {
			docBacklink = e
		}
	}

	if issueBacklink == nil {
		t.Fatalf("expected a backlink entry for GRNT-1, got %+v", ws.Backlinks)
	}
	if len(issueBacklink.Sources) != 1 || issueBacklink.Sources[0].Kind != "document" ||
		issueBacklink.Sources[0].ID != "decisions/0001-test-decision.md" {
		t.Errorf("unexpected sources for GRNT-1 backlink: %+v", issueBacklink.Sources)
	}

	if docBacklink == nil {
		t.Fatalf("expected a backlink entry for the decision doc, got %+v", ws.Backlinks)
	}
	if len(docBacklink.Sources) != 1 || docBacklink.Sources[0].Kind != "issue" ||
		docBacklink.Sources[0].ID != "GRNT-1" {
		t.Errorf("unexpected sources for the decision doc's backlink: %+v", docBacklink.Sources)
	}
}

func TestResolveLinkTarget_IgnoresExternalAndUnknown(t *testing.T) {
	root := "testdata/valid"

	if _, _, ok := resolveLinkTarget(root, "decisions", "https://example.com/page"); ok {
		t.Error("expected an external URL to be ignored")
	}
	if _, _, ok := resolveLinkTarget(root, "decisions", "../repos/some-repo/README.md"); ok {
		t.Error("expected a link into repos/ to be ignored")
	}
	if _, _, ok := resolveLinkTarget(root, "decisions", "../issues/GRNT-999/"); !ok {
		t.Error("expected a link to a nonexistent issue directory to still resolve as an issue target (existence isn't checked here)")
	}
}
