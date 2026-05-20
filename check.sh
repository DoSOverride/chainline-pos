#!/bin/bash
# Run before pushing: node --check on all POS JS files
failed=0
for f in pos-*.js; do
  if ! node --check "$f" 2>&1; then
    echo "SYNTAX ERROR: $f"
    failed=1
  fi
done
[ $failed -eq 0 ] && echo "All files OK" || exit 1
