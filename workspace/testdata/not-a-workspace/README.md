Deliberately empty of `projects/` and `issues/` — used by `TestOpen_NotAWorkspace`
to confirm `Open()` returns `ErrNotAWorkspace` instead of crashing. This file
exists only so git tracks the directory; an empty dir wouldn't survive a clone.
