# @reprogate/github-action

Validates fenced `reprogate` YAML blocks in GitHub issue bodies.

Security boundary: this action parses untrusted issue text as data only. It never executes report
commands, does not call external APIs by default, and should not be used with `pull_request_target`.
