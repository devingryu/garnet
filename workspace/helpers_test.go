package workspace

import (
	"io"
	"os"
	"path/filepath"
	"testing"
)

// copyFixture copies workspace/testdata/<name> into a fresh t.TempDir() and
// returns the new root path, so mutating tests never touch the checked-in
// fixtures.
func copyFixture(t *testing.T, name string) string {
	t.Helper()
	src := filepath.Join("testdata", name)
	dst := t.TempDir()

	err := filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		target := filepath.Join(dst, rel)
		if info.IsDir() {
			return os.MkdirAll(target, 0o755)
		}
		return copyFile(path, target)
	})
	if err != nil {
		t.Fatalf("copying fixture %q: %v", name, err)
	}
	return dst
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	return err
}
