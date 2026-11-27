#!/usr/bin/env bash
# Two Hermes agents take turns on a shared thread. See "Agent duet" in AGENTS.md.
#
# Usage: scripts/agent-duet.sh "topic or question" [rounds]
#        Pass "-" as the topic to continue the existing thread; START=B makes the Critic go first.
# Env:   A_MODEL / B_MODEL   override the models (defaults below)
#        PLATE_AGENTS_DIR    where THREAD.md lives (default ~/plate-agents)
set -euo pipefail

TOPIC=${1:?usage: agent-duet.sh "topic or question" [rounds]}
ROUNDS=${2:-3}

REPO=$(cd "$(dirname "$0")/.." && pwd)
DIR=${PLATE_AGENTS_DIR:-$HOME/plate-agents}
THREAD=$DIR/THREAD.md
MAX_THREAD_CHARS=${MAX_THREAD_CHARS:-14000}
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

A_NAME=qwen;    A_ROLE=Proposer; A_MODEL=${A_MODEL:-qwen/qwen4-max:free}
B_NAME=${B_NAME:-tencent}; B_ROLE=Critic; B_MODEL=${B_MODEL:-tencent/hy4-flash:free}   # stepfun/step-3.7-flash:free stalled on long prompts

mkdir -p "$DIR"
if [ ! -f "$THREAD" ]; then
  printf '# Thread\n\n' > "$THREAD"
fi
if [ "$TOPIC" != "-" ]; then   # "-" = continue the existing thread without a new topic
  printf '\n## Topic (%s)\n\n%s\n' "$(date '+%Y-%m-%d %H:%M')" "$TOPIC" >> "$THREAD"
fi

# Run one agent turn. Prints the agent's reply on stdout.
ask() {
  local name=$1 role=$2 model=$3 prompt=$TMP/prompt.txt out attempt
  {
    printf 'You are "%s", the %s in a two-agent discussion about the Plate Together repo.\n' "$name" "$role"
    printf 'Follow the "Agent duet" section of AGENTS.md exactly. Reply once, in plain text, and edit no files.\n\n'
    printf 'Read the thread below (newest message last), then write your reply.\n\n'
    printf -- '----- THREAD -----\n'
    # Keep prompts small: if the thread is long, send the start (topic) plus the most recent turns.
    if [ "$(wc -c < "$THREAD")" -gt "$MAX_THREAD_CHARS" ]; then
      head -c 2500 "$THREAD"
      printf '\n[... earlier turns omitted; full log in %s ...]\n' "$THREAD"
      tail -c $((MAX_THREAD_CHARS - 2500)) "$THREAD"
    else
      cat "$THREAD"
    fi
    printf -- '----- END THREAD -----\n'
  } > "$prompt"

  # -Q: print only the final reply (no banner, reasoning, or tool logs); session id goes to stderr.
  for attempt in 1 2 3; do
    # perl alarm = hard 6-minute cap; --run-budget alone did not stop a stalled free-model call.
    if out=$(perl -e 'alarm 360; exec @ARGV' hermes chat -Q --oneshot --query-file "$prompt" -m "$model" \
               --in "$REPO" --max-turns 6 --run-budget 300 2>"$TMP/err.txt") && [ -n "$out" ]; then
      printf '%s' "$out"
      return 0
    fi
    echo "[$name] attempt $attempt failed ($(head -c 200 "$TMP/err.txt" | tr '\n' ' ')); waiting 200s" >&2
    sleep 200
  done
  return 1
}

n=$(grep -c '^### \[' "$THREAD" || true)
skip_first_a=0; [ "${START:-A}" = B ] && skip_first_a=1   # START=B: the Critic speaks first
for round in $(seq 1 "$ROUNDS"); do
  for who in A B; do
    if [ "$who" = A ] && [ "$skip_first_a" = 1 ]; then skip_first_a=0; continue; fi
    if [ "$who" = A ]; then name=$A_NAME role=$A_ROLE model=$A_MODEL
    else name=$B_NAME role=$B_ROLE model=$B_MODEL; fi

    n=$((n + 1))
    echo "== turn $n: $name ($role, $model) ==" >&2
    reply=$(ask "$name" "$role" "$model") || { echo "giving up on $name" >&2; exit 1; }

    {
      printf '\n### [%s] %s (%s) %s\n\n%s\n' "$n" "$name" "$role" "$(date '+%H:%M')" "$reply"
    } >> "$THREAD"
    printf '%s\n\n' "$reply"

    if printf '%s' "$reply" | grep -qE '^STATUS: (AGREE|ESCALATE)'; then
      echo "stopped: $name wrote a final status" >&2
      echo "Thread: $THREAD" >&2
      exit 0
    fi
  done
done
echo "Thread: $THREAD" >&2
