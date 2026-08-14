package workspace

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// reservedTopLevelDirs are workspace-root directories that have their own
// meaning and are never treated as document folders.
var reservedTopLevelDirs = map[string]bool{
	"projects": true,
	"issues":   true,
	"repos":    true,
}

// Document is a markdown file somewhere in the workspace, outside
// projects/, issues/, and repos/.
type Document struct {
	// Path is relative to the workspace root, forward-slashed.
	Path string `json:"path"`
}

// ListDocuments walks the workspace collecting every .md file outside the
// reserved top-level directories and dotfiles/dotdirs.
func ListDocuments(root string) ([]Document, error) {
	var docs []Document

	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(root, path)
		if err != nil {
			return err
		}
		if rel == "." {
			return nil
		}
		name := d.Name()

		if d.IsDir() {
			if strings.HasPrefix(name, ".") {
				return filepath.SkipDir
			}
			if reservedTopLevelDirs[rel] {
				return filepath.SkipDir
			}
			return nil
		}

		if strings.HasPrefix(name, ".") || !strings.HasSuffix(name, ".md") {
			return nil
		}
		docs = append(docs, Document{Path: filepath.ToSlash(rel)})
		return nil
	})
	if err != nil {
		return nil, err
	}

	if docs == nil {
		docs = []Document{}
	}
	sort.Slice(docs, func(i, j int) bool { return docs[i].Path < docs[j].Path })
	return docs, nil
}

// resolveDocumentPath validates relPath and returns its absolute path on
// disk. It rejects paths that escape root, fall under a reserved top-level
// directory, or don't end in .md.
func resolveDocumentPath(root, relPath string) (string, error) {
	clean := filepath.Clean(filepath.FromSlash(relPath))
	if filepath.IsAbs(clean) || clean == "." || strings.HasPrefix(clean, "..") {
		return "", fmt.Errorf("invalid document path %q", relPath)
	}
	if !strings.HasSuffix(clean, ".md") {
		return "", fmt.Errorf("only .md documents are supported, got %q", relPath)
	}

	top := strings.SplitN(filepath.ToSlash(clean), "/", 2)[0]
	if reservedTopLevelDirs[top] {
		return "", fmt.Errorf("%q is reserved and not a document path", relPath)
	}

	return filepath.Join(root, clean), nil
}

// ReadDocument returns a document's raw content.
func ReadDocument(root, relPath string) (string, error) {
	abs, err := resolveDocumentPath(root, relPath)
	if err != nil {
		return "", err
	}
	raw, err := os.ReadFile(abs)
	if err != nil {
		return "", fmt.Errorf("reading %q: %w", relPath, err)
	}
	return string(raw), nil
}

// WriteDocument creates or overwrites a document, creating any missing
// parent directories. There is no separate "create" call — writing a path
// that doesn't exist yet is how a new document is made.
func WriteDocument(root, relPath, content string) error {
	abs, err := resolveDocumentPath(root, relPath)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(abs), 0o755); err != nil {
		return fmt.Errorf("creating document directory: %w", err)
	}
	return writeFile(abs, []byte(content))
}
