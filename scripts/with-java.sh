#!/usr/bin/env bash
# The Firestore emulator needs Java 21. Use JAVA_HOME when it already points at 21,
# otherwise the JDK kept for this machine.
set -euo pipefail

# Skip the Firebase update check. On this Mac, ~/.config is not writable, and that
# check crashes the command after the tests have already passed.
export NO_UPDATE_NOTIFIER=1
if [ -n "${HOME:-}" ] && [ -e "${HOME}/.config" ] && [ ! -w "${HOME}/.config" ]; then
  export XDG_CONFIG_HOME="${TMPDIR:-/tmp}/tennis-xdg-config"
  mkdir -p "${XDG_CONFIG_HOME}"
fi

java_major() {
  "$1" -version 2>&1 | sed -n 's/.* version "\([0-9][0-9]*\).*/\1/p' | head -1
}

if [ -n "${JAVA_HOME:-}" ] && [ -x "${JAVA_HOME}/bin/java" ]; then
  major="$(java_major "${JAVA_HOME}/bin/java")"
  if [ -n "${major}" ] && [ "${major}" -ge 21 ]; then
    export PATH="${JAVA_HOME}/bin:${PATH}"
    exec "$@"
  fi
fi

candidates=(
  "/tmp/tennis-jdk/jdk-21.0.12.1+1/Contents/Home"
)
if [ -x /usr/libexec/java_home ]; then
  home="$(/usr/libexec/java_home -v 21 2>/dev/null || true)"
  if [ -n "${home}" ]; then
    candidates+=("${home}")
  fi
fi
for dir in /Library/Java/JavaVirtualMachines/*/Contents/Home "$HOME"/Library/Java/JavaVirtualMachines/*/Contents/Home; do
  candidates+=("${dir}")
done

for candidate in "${candidates[@]}"; do
  if [ -x "${candidate}/bin/java" ]; then
    major="$(java_major "${candidate}/bin/java")"
    if [ -n "${major}" ] && [ "${major}" -ge 21 ]; then
      export JAVA_HOME="${candidate}"
      export PATH="${JAVA_HOME}/bin:${PATH}"
      exec "$@"
    fi
  fi
done

echo "The match checks need Java 21. It was not found." >&2
exit 1
