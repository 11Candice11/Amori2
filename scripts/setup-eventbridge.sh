#!/usr/bin/env bash
# setup-eventbridge.sh
#
# Creates two EventBridge Scheduler rules to stop and start the Amori EC2:
#   - Stop  at 8pm UTC  (10pm SAST) every day
#   - Start at 5am UTC  (7am SAST)  every day
#
# Prerequisites:
#   - AWS CLI configured: aws configure (region eu-north-1)
#   - IAM permissions: scheduler:CreateSchedule, iam:PassRole, ec2:StopInstances,
#     ec2:StartInstances (or AdministratorAccess)
#
# Usage:
#   bash scripts/setup-eventbridge.sh
#
# To remove the schedules:
#   aws scheduler delete-schedule --name amori-stop-ec2  --region eu-north-1
#   aws scheduler delete-schedule --name amori-start-ec2 --region eu-north-1

set -euo pipefail

log()  { printf '\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m[OK] %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m[ERROR] %s\033[0m\n' "$*" >&2; exit 1; }

REGION="eu-north-1"
INSTANCE_ID="i-00ff029271158a4b6"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ROLE_NAME="AmoriEC2SchedulerRole"
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"

log "Account: $ACCOUNT_ID | Region: $REGION | Instance: $INSTANCE_ID"

# ── IAM role for EventBridge Scheduler ───────────────────────────────────────
# EventBridge Scheduler needs a role with ec2:StopInstances and ec2:StartInstances.

log "Checking IAM role $ROLE_NAME ..."
if aws iam get-role --role-name "$ROLE_NAME" &>/dev/null; then
  warn() { printf '\033[1;33m[warn] %s\033[0m\n' "$*"; }
  warn "Role $ROLE_NAME already exists, skipping creation"
else
  log "Creating IAM role $ROLE_NAME ..."

  # Trust policy — allows EventBridge Scheduler to assume this role
  TRUST_POLICY='{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": { "Service": "scheduler.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }]
  }'

  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "$TRUST_POLICY" \
    --description "Allows EventBridge Scheduler to stop/start the Amori EC2 instance" \
    --region "$REGION" \
    --output json > /dev/null

  # Inline policy — only allows stop/start on this specific instance
  INSTANCE_POLICY="{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{
      \"Effect\": \"Allow\",
      \"Action\": [\"ec2:StopInstances\", \"ec2:StartInstances\"],
      \"Resource\": \"arn:aws:ec2:${REGION}:${ACCOUNT_ID}:instance/${INSTANCE_ID}\"
    }]
  }"

  aws iam put-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-name "AmoriEC2StopStart" \
    --policy-document "$INSTANCE_POLICY"

  ok "IAM role created"
  # Brief pause for IAM propagation
  sleep 10
fi

# ── Helper: create or update a schedule ──────────────────────────────────────
upsert_schedule() {
  local name="$1"
  local cron="$2"       # e.g. "cron(0 20 * * ? *)"
  local action="$3"     # StopInstances | StartInstances
  local description="$4"

  local target_arn
  if [[ "$action" == "StopInstances" ]]; then
    target_arn="arn:aws:scheduler:::aws-sdk:ec2:stopInstances"
  else
    target_arn="arn:aws:scheduler:::aws-sdk:ec2:startInstances"
  fi

  # Input must be a JSON string with inner quotes escaped
  local input="{\\\"InstanceIds\\\":[\\\"${INSTANCE_ID}\\\"]}"

  # Build the target JSON as a file to avoid shell quoting issues
  local target_file
  target_file="$(mktemp)"
  cat > "$target_file" <<TARGETJSON
{
  "Arn": "${target_arn}",
  "RoleArn": "${ROLE_ARN}",
  "Input": "{\"InstanceIds\":[\"${INSTANCE_ID}\"]}"
}
TARGETJSON

  log "${description} ..."

  # Try update first; if it doesn't exist, create it
  if aws scheduler get-schedule --name "$name" --region "$REGION" &>/dev/null; then
    aws scheduler update-schedule \
      --name "$name" \
      --schedule-expression "$cron" \
      --schedule-expression-timezone "UTC" \
      --flexible-time-window '{"Mode":"OFF"}' \
      --target "file://${target_file}" \
      --region "$REGION" \
      --output json > /dev/null
    rm -f "$target_file"
    ok "Schedule '$name' updated"
  else
    aws scheduler create-schedule \
      --name "$name" \
      --description "$description" \
      --schedule-expression "$cron" \
      --schedule-expression-timezone "UTC" \
      --flexible-time-window '{"Mode":"OFF"}' \
      --target "file://${target_file}" \
      --region "$REGION" \
      --output json > /dev/null
    rm -f "$target_file"
    ok "Schedule '$name' created"
  fi
}

# ── Stop at 8pm UTC (10pm SAST) ───────────────────────────────────────────────
upsert_schedule \
  "amori-stop-ec2" \
  "cron(0 20 * * ? *)" \
  "StopInstances" \
  "Stop Amori EC2 at 10pm SAST (8pm UTC)"

# ── Start at 5am UTC (7am SAST) ───────────────────────────────────────────────
upsert_schedule \
  "amori-start-ec2" \
  "cron(0 5 * * ? *)" \
  "StartInstances" \
  "Start Amori EC2 at 7am SAST (5am UTC)"

# ── Summary ───────────────────────────────────────────────────────────────────
cat <<SUMMARY

╔══════════════════════════════════════════════════════════════════════════════╗
║  EventBridge schedules active                                                ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Stop : 8:00pm UTC = 10:00pm SAST every day                                 ║
║  Start: 5:00am UTC =  7:00am SAST every day                                 ║
║  Instance: ${INSTANCE_ID}                                                    ║
║                                                                              ║
║  The app will show a night mode banner in-app from 10pm-7am SAST.           ║
║  Estimated savings: ~\$8/month (stopped ~9hrs/day)                           ║
║                                                                              ║
║  To adjust times, re-run this script after editing the cron expressions,    ║
║  or update them directly in the AWS Console under EventBridge > Schedules.  ║
╚══════════════════════════════════════════════════════════════════════════════╝
SUMMARY
