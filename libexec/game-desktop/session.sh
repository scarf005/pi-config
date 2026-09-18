#!/bin/sh
set -eu

helpers=
cleanup_helpers() {
    status=$?
    trap - EXIT INT TERM
    for helper in $helpers; do
        kill -TERM "$helper" 2>/dev/null || :
    done
    for helper in $helpers; do
        wait "$helper" 2>/dev/null || :
    done
    exit "$status"
}
trap cleanup_helpers EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

openbox --sm-disable >"$XDG_RUNTIME_DIR/openbox.log" 2>&1 &
helpers="$helpers $!"
/usr/libexec/at-spi-bus-launcher --launch-immediately --a11y=1 --screen-reader=1 >"$XDG_RUNTIME_DIR/accessibility.log" 2>&1 &
helpers="$helpers $!"
gdbus wait --session --timeout 10 org.a11y.Bus
AT_SPI_BUS_ADDRESS=$(gdbus call --session --dest org.a11y.Bus --object-path /org/a11y/bus --method org.a11y.Bus.GetAddress | python3 -c "import ast,sys; print(ast.literal_eval(sys.stdin.read())[0])")
export AT_SPI_BUS_ADDRESS
/usr/libexec/at-spi2-registryd >"$XDG_RUNTIME_DIR/registry.log" 2>&1 &
helpers="$helpers $!"
gdbus wait --address "$AT_SPI_BUS_ADDRESS" --timeout 10 org.a11y.atspi.Registry

# The EXIT trap preserves both successful and failed command statuses.
"$@"
