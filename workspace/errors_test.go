package workspace

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"regexp"
	"sort"
	"testing"
)

func TestEncodeError_WrapsCodedErrorsInAnEnvelope(t *testing.T) {
	err := EncodeError(errInvalidTransition("todo", "done"))
	if err == nil {
		t.Fatal("expected an error")
	}

	var env errorEnvelope
	if jsonErr := json.Unmarshal([]byte(err.Error()), &env); jsonErr != nil {
		t.Fatalf("encoded error is not JSON: %v (%q)", jsonErr, err.Error())
	}
	if env.Garnet != envelopeVersion {
		t.Errorf("garnet = %d, want %d", env.Garnet, envelopeVersion)
	}
	if env.Code != CodeInvalidTransition {
		t.Errorf("code = %q, want %q", env.Code, CodeInvalidTransition)
	}
	if env.Params["from"] != "todo" || env.Params["to"] != "done" {
		t.Errorf("params = %v, want from=todo to=done", env.Params)
	}
	if env.Message == "" {
		t.Error("message is empty; the developer-facing text should survive encoding")
	}
}

func TestEncodeError_FindsCodedErrorThroughWrapping(t *testing.T) {
	wrapped := fmt.Errorf("while doing something: %w", errTitleRequired())

	var env errorEnvelope
	if err := json.Unmarshal([]byte(EncodeError(wrapped).Error()), &env); err != nil {
		t.Fatalf("wrapped coded error was not encoded: %v", err)
	}
	if env.Code != CodeTitleRequired {
		t.Errorf("code = %q, want %q", env.Code, CodeTitleRequired)
	}
}

func TestEncodeError_LeavesUncodedErrorsAlone(t *testing.T) {
	plain := errors.New("some unexpected I/O failure")
	if got := EncodeError(plain); got != plain {
		t.Errorf("EncodeError(plain) = %v, want the error untouched", got)
	}
	if EncodeError(nil) != nil {
		t.Error("EncodeError(nil) should stay nil")
	}
}

func TestCodedError_UnwrapsToItsCause(t *testing.T) {
	cause := os.ErrNotExist
	err := errParentNotFound("GRNT-9", cause)
	if !errors.Is(err, os.ErrNotExist) {
		t.Error("wrapping a cause in a CodedError should not hide it from errors.Is")
	}
}

// TestErrorCodeInventory enforces AGENTS.md rule 12: every code the Go side
// can emit has a string in the source catalog, and the catalog carries no
// translations for codes that no longer exist. The const block in errors.go is
// the source of truth, so this reads it rather than a hand-kept list that
// would drift.
func TestErrorCodeInventory(t *testing.T) {
	source, err := os.ReadFile("errors.go")
	if err != nil {
		t.Fatalf("reading errors.go: %v", err)
	}
	matches := regexp.MustCompile(`\n\tCode\w+\s+= "([a-z_]+)"`).FindAllStringSubmatch(string(source), -1)
	if len(matches) == 0 {
		t.Fatal("found no error code constants; has the const block moved?")
	}
	declared := map[string]bool{}
	for _, m := range matches {
		declared[m[1]] = true
	}

	raw, err := os.ReadFile("../frontend/src/locales/en/translation.json")
	if err != nil {
		t.Fatalf("reading the en catalog: %v", err)
	}
	var catalog struct {
		Errors map[string]string `json:"errors"`
	}
	if err := json.Unmarshal(raw, &catalog); err != nil {
		t.Fatalf("parsing the en catalog: %v", err)
	}

	for _, code := range sortedKeys(declared) {
		if _, ok := catalog.Errors[code]; !ok {
			t.Errorf("error code %q has no message in locales/en/translation.json", code)
		}
	}
	for _, key := range sortedKeys(catalog.Errors) {
		// "unknown" is the frontend's fallback for uncoded errors — it has no
		// Go constant by design.
		if key == "unknown" {
			continue
		}
		if !declared[key] {
			t.Errorf("locales/en/translation.json translates %q, which no Go error code emits", key)
		}
	}
}

func sortedKeys[V any](m map[string]V) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}
