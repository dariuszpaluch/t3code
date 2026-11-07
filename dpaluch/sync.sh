#!/bin/bash
# Keeps the dpaluch-nightly branch on top of the upstream T3 Code nightly.
# It merges the newest upstream nightly tag and the newest head of every PR in
# dpaluch/prs.txt. With --push it also pushes the branch and tags a new HEAD
# as <nightly tag>-dpaluch.<n>. The Mac builds only these tags.
#
# The workflow "Sync dpaluch-nightly" (on the main branch) runs this every
# night. Run it locally to resolve a merge conflict: it stops at the conflict.
#
# Usage: dpaluch/sync.sh [--push]
#
# Written for bash 3.2 too (macOS system bash).

set -euo pipefail

BRANCH="dpaluch-nightly"
UPSTREAM_REPO="pingdotgg/t3code"
UPSTREAM_URL="https://github.com/${UPSTREAM_REPO}.git"
TAG_SUFFIX="-dpaluch"

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

log() { printf '%s\n' "$*"; }
fail() {
  log "ERROR: $*" >&2
  exit 1
}

push="no"
case "${1:-}" in
  "") ;;
  --push) push="yes" ;;
  *)
    echo "Usage: $0 [--push]" >&2
    exit 2
    ;;
esac

[[ "$(git symbolic-ref --short HEAD 2>/dev/null)" == "$BRANCH" ]] || fail "Check out the $BRANCH branch first."
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || fail "Commit your changes first."

git remote get-url upstream >/dev/null 2>&1 || git remote add upstream "$UPSTREAM_URL"

# Take the commits pushed from somewhere else first, so the push below works.
if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
  git fetch --quiet origin "$BRANCH"
  git merge --quiet --ff --no-edit "origin/$BRANCH"
fi

# Nightly tags look like v0.1.8-nightly.20261107.4301; sort by date, then run number.
nightly_tag="$(git ls-remote --tags upstream 'refs/tags/v*-nightly.*' |
  awk '{print $2}' | grep -v '\^{}$' | sed 's#refs/tags/##' |
  awk -F. '{print $(NF-1) "." $NF " " $0}' | sort -t. -k1,1n -k2,2n |
  tail -1 | awk '{print $2}')"
[[ -n "$nightly_tag" ]] || fail "No upstream nightly tag found."
git fetch --quiet --no-tags upstream "refs/tags/${nightly_tag}:refs/tags/${nightly_tag}"

merge() {
  local ref="$1" message="$2"
  if ! git merge --quiet --no-ff --no-edit -m "$message" "$ref"; then
    fail "Conflict: $message. Resolve it, commit, then run dpaluch/sync.sh again."
  fi
}

log "Nightly: $nightly_tag"
merge "$nightly_tag" "Merge upstream nightly $nightly_tag"

tag_message="T3 Code dpaluch-nightly
Base: $nightly_tag"

for pr in $(sed -e 's/#.*//' -e 's/[[:space:]]//g' dpaluch/prs.txt | grep -E '^[0-9]+$' || true); do
  info="$(gh pr view "$pr" --repo "$UPSTREAM_REPO" --json state,mergeCommit \
    -q '.state + " " + (.mergeCommit.oid // "")')" || fail "Cannot read PR #$pr from GitHub."
  state="${info%% *}"
  merge_commit="${info#* }"
  if [[ "$state" == "MERGED" && -n "$merge_commit" ]]; then
    git fetch --quiet --no-tags upstream "$merge_commit" 2>/dev/null || true
    if git merge-base --is-ancestor "$merge_commit" HEAD 2>/dev/null; then
      log "PR #$pr: merged upstream and already in the branch. Remove it from dpaluch/prs.txt."
      continue
    fi
  fi
  [[ "$state" == "CLOSED" ]] && log "WARNING: PR #$pr is closed without merge. Merging it anyway."

  git fetch --quiet --no-tags --force upstream "pull/${pr}/head:refs/remotes/upstream/pr/${pr}"
  head="$(git rev-parse "refs/remotes/upstream/pr/${pr}")"
  log "PR #$pr: ${head:0:12}"
  merge "refs/remotes/upstream/pr/${pr}" "Merge upstream PR #$pr"
  tag_message="$tag_message
PR #$pr: ${head:0:12}"
done

if [[ "$push" != "yes" ]]; then
  log "Done. Run dpaluch/sync.sh --push to push the branch and tag it."
  exit 0
fi

git push --quiet origin "HEAD:refs/heads/$BRANCH"

# Tags on origin: "<sha> refs/tags/<name>^{}" lines give the commit of an annotated tag.
remote_tags="$(git ls-remote --tags origin "refs/tags/v*-nightly.*${TAG_SUFFIX}.*")"
head="$(git rev-parse HEAD)"
existing="$(printf '%s\n' "$remote_tags" |
  awk -v head="$head" '$1 == head && $2 ~ /\^\{\}$/ {sub("^refs/tags/", "", $2); sub("\\^\\{\\}$", "", $2); print $2}' |
  head -1)"
if [[ -n "$existing" ]]; then
  log "HEAD is already tagged as $existing."
  exit 0
fi

last="$(printf '%s\n' "$remote_tags" | awk '{print $2}' | grep -v '\^{}$' |
  sed -n "s#^refs/tags/${nightly_tag}${TAG_SUFFIX}\.\([0-9][0-9]*\)\$#\1#p" | sort -n | tail -1)"
new_tag="${nightly_tag}${TAG_SUFFIX}.$((${last:-0} + 1))"
git tag -a "$new_tag" -m "$tag_message"
git push --quiet origin "refs/tags/$new_tag"
log "Tagged $new_tag"
