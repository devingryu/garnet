package workspace

import (
	"errors"
	"testing"
)

func TestParseTodos(t *testing.T) {
	body := "Some prose.\n" +
		"- [ ] first thing\n" +
		"- [x] second thing, done\n" +
		"* [X] third thing, done, star bullet, capital X\n" +
		"not a checklist line\n" +
		"  - [ ] indented, still matches\n"

	todos := parseTodos(body)
	if len(todos) != 4 {
		t.Fatalf("expected 4 todos, got %d: %+v", len(todos), todos)
	}

	want := []TodoItem{
		{Line: 1, Text: "first thing", Done: false},
		{Line: 2, Text: "second thing, done", Done: true},
		{Line: 3, Text: "third thing, done, star bullet, capital X", Done: true},
		{Line: 5, Text: "indented, still matches", Done: false},
	}
	for i, w := range want {
		if todos[i] != w {
			t.Errorf("todos[%d] = %+v, want %+v", i, todos[i], w)
		}
	}
}

func TestParseTodos_NoChecklistItems(t *testing.T) {
	if todos := parseTodos("just prose\nno checkboxes here\n"); len(todos) != 0 {
		t.Errorf("expected no todos, got %+v", todos)
	}
}

func TestToggleTodo_ChecksAndUnchecks(t *testing.T) {
	root := copyFixture(t, "valid")
	setIdentity(t, root)

	if err := UpdateIssueBody(root, "GRNT-1", "- [ ] do the thing\n- [x] already done\n"); err != nil {
		t.Fatalf("UpdateIssueBody() returned error: %v", err)
	}

	issue, err := ToggleTodo(root, "GRNT-1", 0)
	if err != nil {
		t.Fatalf("ToggleTodo() returned error: %v", err)
	}
	if !issue.Todos[0].Done {
		t.Errorf("expected line 0 to be checked after toggling, got %+v", issue.Todos[0])
	}
	if issue.Todos[1].Text != "already done" || !issue.Todos[1].Done {
		t.Errorf("expected the untouched second item to survive unchanged, got %+v", issue.Todos[1])
	}

	// Toggling again unchecks it.
	issue, err = ToggleTodo(root, "GRNT-1", 0)
	if err != nil {
		t.Fatalf("ToggleTodo() (second call) returned error: %v", err)
	}
	if issue.Todos[0].Done {
		t.Errorf("expected line 0 to be unchecked after toggling twice, got %+v", issue.Todos[0])
	}
}

func TestToggleTodo_PreservesSurroundingText(t *testing.T) {
	root := copyFixture(t, "valid")
	setIdentity(t, root)

	body := "# Heading\n\n- [ ] a todo\n\nMore prose after.\n"
	if err := UpdateIssueBody(root, "GRNT-1", body); err != nil {
		t.Fatalf("UpdateIssueBody() returned error: %v", err)
	}

	issue, err := ToggleTodo(root, "GRNT-1", 2)
	if err != nil {
		t.Fatalf("ToggleTodo() returned error: %v", err)
	}

	want := "# Heading\n\n- [x] a todo\n\nMore prose after.\n"
	if issue.Description != want {
		t.Errorf("Description = %q, want %q", issue.Description, want)
	}
}

func TestToggleTodo_LineOutOfRange(t *testing.T) {
	root := copyFixture(t, "valid")
	setIdentity(t, root)

	if err := UpdateIssueBody(root, "GRNT-1", "- [ ] only line\n"); err != nil {
		t.Fatalf("UpdateIssueBody() returned error: %v", err)
	}

	_, err := ToggleTodo(root, "GRNT-1", 99)
	var coded *CodedError
	if !errors.As(err, &coded) || coded.Code != CodeTodoNotFound {
		t.Fatalf("expected a %q coded error, got %v", CodeTodoNotFound, err)
	}
}

func TestToggleTodo_LineNotAChecklistItem(t *testing.T) {
	root := copyFixture(t, "valid")
	setIdentity(t, root)

	if err := UpdateIssueBody(root, "GRNT-1", "just a line of prose\n"); err != nil {
		t.Fatalf("UpdateIssueBody() returned error: %v", err)
	}

	_, err := ToggleTodo(root, "GRNT-1", 0)
	var coded *CodedError
	if !errors.As(err, &coded) || coded.Code != CodeTodoNotFound {
		t.Fatalf("expected a %q coded error, got %v", CodeTodoNotFound, err)
	}
}

func TestToggleTodo_IssueNotFound(t *testing.T) {
	root := copyFixture(t, "valid")

	if _, err := ToggleTodo(root, "GRNT-999", 0); !errors.Is(err, ErrIssueNotFound) {
		t.Fatalf("expected ErrIssueNotFound, got %v", err)
	}
}
