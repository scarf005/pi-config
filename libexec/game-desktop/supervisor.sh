#!/bin/sh
set -eu

# This shell owns the private process group. Keep it alive until xvfb-run exits
# so the launcher can stop all descendants before removing runtime resources.
pidfile=$1
shift
printf '%s\n' "$$" > "$pidfile"
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

# Release the inherited display-selection lock only after the X server starts.
xvfb-run -a --auth-file="$XDG_RUNTIME_DIR/Xauthority" \
    --server-args="-screen 0 1600x900x24 -auth $XDG_RUNTIME_DIR/Xauthority" \
    sh -ec 'flock -u 9; exec "$@"' sh \
    dbus-run-session -- sh "$script_dir/session.sh" "$@"
