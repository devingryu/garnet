#!/bin/sh
# Everything a commit has to pass (AGENTS.md rule 13).
set -eu
cd "$(dirname "$0")"

# The Go packages are listed rather than matched with ./... because
# frontend/node_modules sits inside the module and ships Go sources of its own
# (flatted). go.mod's `ignore` directive is the proper fix, but the Wails CLI
# can't parse that directive yet and refuses to build — so the packages are
# named here instead. Add new Go packages to both lists.
GO_SOURCES="app.go main.go workspace"
GO_PACKAGES=". ./workspace/..."

echo '==> gofmt'
unformatted=$(gofmt -l $GO_SOURCES)
if [ -n "$unformatted" ]; then
    echo "$unformatted" >&2
    echo 'run: gofmt -w' $GO_SOURCES >&2
    exit 1
fi

echo '==> go vet'
# shellcheck disable=SC2086
go vet $GO_PACKAGES

echo '==> go test'
# shellcheck disable=SC2086
go test $GO_PACKAGES

echo '==> frontend'
cd frontend && bun run check
