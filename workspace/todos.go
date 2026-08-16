package workspace

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// TodoItem is one GFM task-list line ("- [ ] text" / "- [x] text") found in
// an issue's description. Per GARNET-13, this is deliberately not a new
// schema: no field for it in .garnet.yaml, nothing stored beyond the
// markdown a person already typed into issue.md. It's derived at load time,
// the same way Backlinks are — see ADR 0004's reasoning, which applies here
// just as much: a stored copy is one half of a pair that can drift from the
// text it's supposed to mirror.
type TodoItem struct {
	// Line is the 0-indexed line number within Description. It's the only
	// handle ToggleTodo needs — there's no separate ID to keep in sync.
	Line int    `json:"line"`
	Text string `json:"text"`
	Done bool   `json:"done"`
}

// todoLineRE matches a GFM task-list item. Capture groups: (1) everything up
// to and including the opening "[", so it can be reproduced unchanged, (2)
// the checkbox state, (3) the closing "]" plus following whitespace, and (4)
// the item's text.
var todoLineRE = regexp.MustCompile(`^(\s*[-*+]\s\[)([ xX])(\]\s+)(.*)$`)

// parseTodos scans body for GFM task-list items, in the order they appear.
func parseTodos(body string) []TodoItem {
	todos := []TodoItem{}
	for i, line := range strings.Split(body, "\n") {
		m := todoLineRE.FindStringSubmatch(line)
		if m == nil {
			continue
		}
		todos = append(todos, TodoItem{
			Line: i,
			Text: m[4],
			Done: m[2] == "x" || m[2] == "X",
		})
	}
	return todos
}

// ToggleTodo flips the checked state of the task-list item at line within
// issueID's issue.md. line refers to TodoItem.Line from the Issue most
// recently read — read fresh here rather than trusting a caller-held copy,
// since the file may have changed since.
func ToggleTodo(root, issueID string, line int) (*Issue, error) {
	dir := filepath.Join(root, "issues", issueID)
	if _, err := readIssueMeta(dir); err != nil {
		return nil, err
	}

	raw, err := os.ReadFile(filepath.Join(dir, "issue.md"))
	if err != nil {
		return nil, errTodoNotFound(issueID, line)
	}

	lines := strings.Split(string(raw), "\n")
	if line < 0 || line >= len(lines) {
		return nil, errTodoNotFound(issueID, line)
	}
	m := todoLineRE.FindStringSubmatch(lines[line])
	if m == nil {
		return nil, errTodoNotFound(issueID, line)
	}

	flipped := "x"
	if m[2] == "x" || m[2] == "X" {
		flipped = " "
	}
	lines[line] = m[1] + flipped + m[3] + m[4]

	if err := writeFile(filepath.Join(dir, "issue.md"), []byte(strings.Join(lines, "\n"))); err != nil {
		return nil, err
	}
	return loadIssue(dir, issueID)
}
