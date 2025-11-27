#!/usr/bin/env ts-node

import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import dotenv from 'dotenv';

const execAsync = promisify(exec);

// Load environment variables
dotenv.config();

// Configuration
const BACKUP_DIR = path.join(process.cwd(), 'backups');
const MAX_BACKUPS = 30; // Keep last 30 backups

// Ensure backup directory exists with correct permissions
if (!fs.existsSync(BACKUP_DIR)) {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o755 });
    console.log(`Created backup directory: ${BACKUP_DIR}`);
  } catch (error) {
    console.error(`Failed to create backup directory: ${error}`);
    process.exit(1);
  }
}

// Verify directory is writable
try {
  fs.accessSync(BACKUP_DIR, fs.constants.W_OK);
} catch (error) {
  console.error(`Backup directory is not writable: ${BACKUP_DIR}`);
  console.error('Please check directory permissions and try again.');
  process.exit(1);
}

async function createBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `auto-backup-${timestamp}.sql`;
    const backupPath = path.join(BACKUP_DIR, backupName);
    
    // Get database configuration from environment
    const dbUrl = new URL(process.env.DATABASE_URL || '');
    const dbName = dbUrl.pathname.replace(/^\/+/, '');
    const dbUser = dbUrl.username;
    const dbPass = dbUrl.password;
    const dbHost = dbUrl.hostname;
    const dbPort = dbUrl.port || '5432';

    console.log(`[${new Date().toISOString()}] Creating database backup: ${backupName}`);
    
    // Escape the backup path for shell
    const escapedBackupPath = `"${backupPath}"`;
    
    // Create the backup
    const cmd = `PGPASSWORD="${dbPass}" pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f ${escapedBackupPath}`;
    console.log(`Executing: ${cmd.replace(dbPass, '*****')}`);
    const { stdout, stderr } = await execAsync(cmd, { shell: '/bin/bash' });
    
    if (stderr) {
      console.error(`Backup warning: ${stderr}`);
    }
    
    console.log(`[${new Date().toISOString()}] Backup created successfully: ${backupPath}`);
    
    // Clean up old backups
    await cleanupOldBackups();
    
    return { success: true, backupPath };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Backup failed:`, error);
    return { success: false, error };
  }
}

async function cleanupOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('auto-backup-') && file.endsWith('.sql'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        time: fs.statSync(path.join(BACKUP_DIR, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);
    
    // Keep only the most recent MAX_BACKUPS files
    const toDelete = files.slice(MAX_BACKUPS);
    
    for (const file of toDelete) {
      try {
        fs.unlinkSync(file.path);
        console.log(`[${new Date().toISOString()}] Deleted old backup: ${file.name}`);
      } catch (err) {
        console.error(`[${new Date().toISOString()}] Error deleting old backup ${file.name}:`, err);
      }
    }
    
    return { deleted: toDelete.length };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error cleaning up old backups:`, error);
    return { error };
  }
}

// Run the backup
createBackup()
  .then(({ success, backupPath, error }) => {
    if (success) {
      console.log(`[${new Date().toISOString()}] Backup completed successfully: ${backupPath}`);
      process.exit(0);
    } else {
      console.error(`[${new Date().toISOString()}] Backup failed:`, error);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error(`[${new Date().toISOString()}] Unhandled error:`, error);
    process.exit(1);
  });
