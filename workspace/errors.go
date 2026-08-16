package workspace

import (
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
)

// Error codes are a stable API, not internal identifiers: the frontend maps
// each one to a translated message (frontend/src/locales/*/translation.json),
// so renaming a code is a breaking change rather than a refactor.
//
// Only failures a person is expected to act on get a code. Unexpected I/O
// errors travel uncoded and the frontend renders a generic message with the
// raw text as detail — inventing a code for every os.ReadFile failure would
// be a translation catalog nobody can maintain.
const (
	CodeNotAWorkspace        = "not_a_workspace"
	CodeIssueNotFound        = "issue_not_found"
	CodeProjectLoadFailed    = "project_load_failed"
	CodeTitleRequired        = "title_required"
	CodeNoteBodyRequired     = "note_body_required"
	CodeIdentityRequired     = "identity_required"
	CodeIssueTypeNotDeclared = "issue_type_not_declared"
	CodeStatusNotDeclared    = "status_not_declared"
	CodeInvalidTransition    = "invalid_transition"
	CodeNotAProjectMember    = "not_a_project_member"
	CodeMemberAlreadyExists  = "member_already_exists"
	CodeParentNotFound       = "parent_not_found"
	CodeLinkTargetNotFound   = "link_target_not_found"
	CodeTransitionUnknown    = "transition_unknown_status"
	CodeRepoPathTaken        = "repo_path_taken"
	CodeRepoNotDeclared      = "repo_not_declared"
	CodeDocumentPathInvalid  = "document_path_invalid"
	CodeDocumentNotMarkdown  = "document_not_markdown"
	CodeDocumentPathReserved = "document_path_reserved"
	CodeDocumentUnreadable   = "document_unreadable"
	CodeTodoNotFound         = "todo_not_found"
	CodeProjectKeyRequired   = "project_key_required"
	CodeProjectKeyInvalid    = "project_key_invalid"
	CodeProjectNameRequired  = "project_name_required"
	CodeProjectAlreadyExists = "project_already_exists"
)

// CodedError is a failure the UI is expected to show to a person. Code says
// which message to render and Params fills its placeholders; Message is
// English and exists for logs, tests, and `go test -v` output only — it is
// never what the user reads.
type CodedError struct {
	Code    string
	Params  map[string]string
	Message string
	// cause keeps the underlying error reachable through errors.Is/As, so
	// wrapping something in a CodedError doesn't hide it from callers.
	cause error
}

func (e *CodedError) Error() string { return e.Message }

func (e *CodedError) Unwrap() error { return e.cause }

// errorEnvelope is the wire form of a CodedError. Wails transports errors as
// plain strings — it calls Error() and sends the result — so the code and
// params have to ride inside that string. The "garnet" discriminator lets the
// frontend tell an envelope apart from an ordinary error message that happens
// to start with "{".
type errorEnvelope struct {
	Garnet  int               `json:"garnet"`
	Code    string            `json:"code"`
	Params  map[string]string `json:"params,omitempty"`
	Message string            `json:"message"`
}

const envelopeVersion = 1

// EncodeError converts err into the form the frontend decodes: a JSON
// envelope when a CodedError appears anywhere in the chain, err untouched
// otherwise. Call it at the Wails boundary (app.go) and nowhere else —
// inside the package, errors stay ordinary Go errors.
func EncodeError(err error) error {
	if err == nil {
		return nil
	}
	var coded *CodedError
	if !errors.As(err, &coded) {
		return err
	}
	payload, marshalErr := json.Marshal(errorEnvelope{
		Garnet:  envelopeVersion,
		Code:    coded.Code,
		Params:  coded.Params,
		Message: err.Error(),
	})
	if marshalErr != nil {
		return err
	}
	return errors.New(string(payload))
}

// ErrNotAWorkspace is returned by Open when the given directory has neither a
// projects/ nor an issues/ subdirectory.
var ErrNotAWorkspace = &CodedError{
	Code:    CodeNotAWorkspace,
	Message: "not a Garnet workspace: expected a \"projects\" or \"issues\" directory",
}

// ErrIssueNotFound is returned when an issue directory has no .garnet.yaml.
var ErrIssueNotFound = &CodedError{
	Code:    CodeIssueNotFound,
	Message: "issue not found",
}

// The constructors below are the full inventory of coded failures. Keeping
// them in one place — rather than building CodedError literals at each call
// site — is what makes "every code has a translation" checkable by reading a
// single file.

func errProjectLoadFailed(projectKey string, cause error) error {
	return &CodedError{
		Code:    CodeProjectLoadFailed,
		Params:  map[string]string{"project": projectKey},
		Message: fmt.Sprintf("loading project %q: %v", projectKey, cause),
		cause:   cause,
	}
}

func errTitleRequired() error {
	return &CodedError{Code: CodeTitleRequired, Message: "title is required"}
}

func errNoteBodyRequired() error {
	return &CodedError{Code: CodeNoteBodyRequired, Message: "note body is required"}
}

// errIdentityRequired takes the attempted action for the log message only.
// All three call sites share one code because the fix is the same regardless:
// set up an identity for this workspace.
func errIdentityRequired(action string) error {
	return &CodedError{
		Code:    CodeIdentityRequired,
		Message: fmt.Sprintf("no identity configured for this workspace — set one up before %s", action),
	}
}

func errIssueTypeNotDeclared(issueType, projectKey string) error {
	return &CodedError{
		Code:    CodeIssueTypeNotDeclared,
		Params:  map[string]string{"type": issueType, "project": projectKey},
		Message: fmt.Sprintf("issue type %q is not declared by project %q", issueType, projectKey),
	}
}

func errStatusNotDeclared(status string) error {
	return &CodedError{
		Code:    CodeStatusNotDeclared,
		Params:  map[string]string{"status": status},
		Message: fmt.Sprintf("%q is not a status declared by this project's workflow", status),
	}
}

func errInvalidTransition(from, to string) error {
	return &CodedError{
		Code:    CodeInvalidTransition,
		Params:  map[string]string{"from": from, "to": to},
		Message: fmt.Sprintf("invalid transition from %q to %q", from, to),
	}
}

func errNotAProjectMember(email, projectKey string) error {
	return &CodedError{
		Code:    CodeNotAProjectMember,
		Params:  map[string]string{"email": email, "project": projectKey},
		Message: fmt.Sprintf("%q is not a registered member of project %q", email, projectKey),
	}
}

func errMemberAlreadyExists(email, projectKey string) error {
	return &CodedError{
		Code:    CodeMemberAlreadyExists,
		Params:  map[string]string{"email": email, "project": projectKey},
		Message: fmt.Sprintf("%q is already a member of %q", email, projectKey),
	}
}

func errParentNotFound(parentID string, cause error) error {
	return &CodedError{
		Code:    CodeParentNotFound,
		Params:  map[string]string{"parent": parentID},
		Message: fmt.Sprintf("parent %q: %v", parentID, cause),
		cause:   cause,
	}
}

func errLinkTargetNotFound(target string, cause error) error {
	return &CodedError{
		Code:    CodeLinkTargetNotFound,
		Params:  map[string]string{"target": target},
		Message: fmt.Sprintf("link target %q: %v", target, cause),
		cause:   cause,
	}
}

func errTransitionUnknownStatus(status string) error {
	return &CodedError{
		Code:    CodeTransitionUnknown,
		Params:  map[string]string{"status": status},
		Message: fmt.Sprintf("transition references undeclared status %q", status),
	}
}

func errRepoPathTaken(path string) error {
	return &CodedError{
		Code:    CodeRepoPathTaken,
		Params:  map[string]string{"path": path},
		Message: fmt.Sprintf("a repo is already declared at path %q", path),
	}
}

func errRepoNotDeclared(path string) error {
	return &CodedError{
		Code:    CodeRepoNotDeclared,
		Params:  map[string]string{"path": path},
		Message: fmt.Sprintf("no repo declared at path %q", path),
	}
}

func errDocumentPathInvalid(path string) error {
	return &CodedError{
		Code:    CodeDocumentPathInvalid,
		Params:  map[string]string{"path": path},
		Message: fmt.Sprintf("invalid document path %q", path),
	}
}

func errDocumentNotMarkdown(path string) error {
	return &CodedError{
		Code:    CodeDocumentNotMarkdown,
		Params:  map[string]string{"path": path},
		Message: fmt.Sprintf("only .md documents are supported, got %q", path),
	}
}

func errDocumentPathReserved(path string) error {
	return &CodedError{
		Code:    CodeDocumentPathReserved,
		Params:  map[string]string{"path": path},
		Message: fmt.Sprintf("%q is reserved and not a document path", path),
	}
}

func errDocumentUnreadable(path string, cause error) error {
	return &CodedError{
		Code:    CodeDocumentUnreadable,
		Params:  map[string]string{"path": path},
		Message: fmt.Sprintf("reading %q: %v", path, cause),
		cause:   cause,
	}
}

func errTodoNotFound(issueID string, line int) error {
	return &CodedError{
		Code:    CodeTodoNotFound,
		Params:  map[string]string{"issue": issueID, "line": strconv.Itoa(line)},
		Message: fmt.Sprintf("issue %q has no checklist item on line %d", issueID, line),
	}
}

func errProjectKeyRequired() error {
	return &CodedError{Code: CodeProjectKeyRequired, Message: "project key is required"}
}

func errProjectKeyInvalid(key string) error {
	return &CodedError{
		Code:    CodeProjectKeyInvalid,
		Params:  map[string]string{"key": key},
		Message: fmt.Sprintf("project key %q must contain only letters, digits, and underscores", key),
	}
}

func errProjectNameRequired() error {
	return &CodedError{Code: CodeProjectNameRequired, Message: "project name is required"}
}

func errProjectAlreadyExists(key string) error {
	return &CodedError{
		Code:    CodeProjectAlreadyExists,
		Params:  map[string]string{"key": key},
		Message: fmt.Sprintf("a project already exists at key %q", key),
	}
}
