#!/bin/bash

# Exit on error
set -e

# Configuration
BACKUP_SCRIPT_PATH="$(pwd)/backend/scripts/auto-backup.ts"
LOG_FILE="$(pwd)/logs/backup.log"
CRON_JOB="0 2 * * * cd $(pwd) && npx ts-node $BACKUP_SCRIPT_PATH >> $LOG_FILE 2>&1"

# Ensure log directory exists
mkdir -p "$(pwd)/logs"

# Check if the cron job already exists
if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT_PATH"; then
  echo "Cron job already exists. Updating..."
  # Remove existing job
  (crontab -l 2>/dev/null | grep -v "$BACKUP_SCRIPT_PATH") | crontab -
fi

# Add the new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

# Set proper permissions on the backup script
chmod +x "$BACKUP_SCRIPT_PATH"

# Create a log entry
echo "[$(date)] Backup cron job has been configured" >> "$LOG_FILE"

echo "✅ Backup cron job has been configured successfully"
echo "🔹 The backup will run daily at 2 AM"
echo "🔹 Logs will be written to: $LOG_FILE"
echo "🔹 To view existing cron jobs, run: crontab -l"
echo "🔹 To edit the cron job manually, run: crontab -e"

# Test the backup script
echo -e "\nTesting the backup script..."
cd "$(pwd)/backend" && npx ts-node scripts/auto-backup.ts

if [ $? -eq 0 ]; then
  echo -e "\n✅ Test backup completed successfully!"
  echo "The automated backup has been configured to run daily at 2 AM."
  echo "You can check the backup files in the 'backups' directory."
else
  echo -e "\n❌ Test backup failed. Please check the logs above for errors."
  exit 1
fi
