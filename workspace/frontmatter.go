package workspace

import (
	"errors"
	"strings"
)

// splitFrontmatter splits a markdown file into its YAML frontmatter and body.
// The frontmatter must be delimited by "---" lines at the start of the file.
// A missing body (frontmatter only, or nothing after the closing "---") is fine.
func splitFrontmatter(content []byte) (frontmatter []byte, body string, err error) {
	text := string(content)
	const delim = "---"

	if !strings.HasPrefix(strings.TrimLeft(text, "\n"), delim) {
		return nil, "", errors.New("missing frontmatter: file must start with a \"---\" block")
	}

	text = strings.TrimLeft(text, "\n")
	text = strings.TrimPrefix(text, delim)
	text = strings.TrimPrefix(text, "\n")

	end := strings.Index(text, "\n"+delim)
	if end == -1 {
		return nil, "", errors.New("missing frontmatter: no closing \"---\" found")
	}

	fm := text[:end]
	rest := text[end+len("\n"+delim):]
	rest = strings.TrimPrefix(rest, "\n")

	return []byte(fm), strings.TrimSpace(rest), nil
}

// joinFrontmatter is splitFrontmatter's inverse: it reassembles a file's
// frontmatter and body so a struct that was parsed with splitFrontmatter can
// be written back without disturbing the free-form body.
func joinFrontmatter(frontmatter []byte, body string) []byte {
	var b strings.Builder
	b.WriteString("---\n")
	b.Write(frontmatter)
	b.WriteString("---\n")
	if body != "" {
		b.WriteString("\n")
		b.WriteString(body)
		b.WriteString("\n")
	}
	return []byte(b.String())
}
