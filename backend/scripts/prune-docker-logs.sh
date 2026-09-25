#!/usr/bin/env bash
#
# prune-docker-logs.sh — enforce a 2-day retention on Docker container logs.
#
# Docker's json-file driver only supports size-based rotation (max-size /
# max-file), not age-based deletion. This script provides the "delete after
# 2 days" behaviour by truncating any container's *-json.log (and its rotated
# .1/.2/... siblings) that hasn't been modified in the last 2 days.
#
# Truncating (rather than deleting) the active log file is important: Docker
# holds the file open, so `rm` would free no space until the container
# restarts and can also confuse the daemon. `: > file` empties it in place and
# the space is reclaimed immediately while the container keeps logging.
#
# Install as a daily cron (see the deploy note / crontab below):
#   5 4 * * * /home/ubuntu/amori/backend/scripts/prune-docker-logs.sh >> /var/log/prune-docker-logs.log 2>&1
#
set -euo pipefail

LOG_DIR="/var/lib/docker/containers"
RETENTION_DAYS=2

if [[ ! -d "$LOG_DIR" ]]; then
  echo "$(date -Is) docker containers dir not found at $LOG_DIR; nothing to do"
  exit 0
fi

# Find container log files older than RETENTION_DAYS and empty them in place.
# -mtime +N matches files modified more than N*24h ago.
pruned=0
while IFS= read -r -d '' logfile; do
  # Empty the file in place (space reclaimed immediately; Docker keeps writing).
  : > "$logfile"
  echo "$(date -Is) truncated $logfile"
  pruned=$((pruned + 1))
done < <(find "$LOG_DIR" -type f -name '*-json.log*' -mtime "+${RETENTION_DAYS}" -print0)

echo "$(date -Is) prune complete; truncated ${pruned} file(s) older than ${RETENTION_DAYS} day(s)"
