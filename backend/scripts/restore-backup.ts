#!/usr/bin/env ts-node

import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import dotenv from 'dotenv';
import readline from 'readline';

const execAsync = promisify(exec);

// Load environment variables
dotenv.config();

// Configuration
const BACKUP_DIR = path.join(process.cwd(), 'backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  console.error(`Backup directory not found: ${BACKUP_DIR}`);
  process.exit(1);
}

async function listBackups() {
  try {
    return fs.readdirSync(BACKUP_DIR)
      .filter(file => file.endsWith('.sql'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        time: fs.statSync(path.join(BACKUP_DIR, file)).mtime
      }))
      .sort((a, b) => b.time.getTime() - a.time.getTime())
      .map(file => file.name);
  } catch (error) {
    console.error('Error listing backups:', error);
    process.exit(1);
  }
}

async function restoreBackup(filename: string) {
  try {
    const backupPath = path.join(BACKUP_DIR, filename);
    
    if (!fs.existsSync(backupPath)) {
      console.error(`Backup file not found: ${backupPath}`);
      process.exit(1);
    }

    // Get database configuration from environment
    const dbUrl = new URL(process.env.DATABASE_URL || '');
    const dbName = dbUrl.pathname.replace(/^\/+/, '');
    const dbUser = dbUrl.username;
    const dbPass = dbUrl.password;
    const dbHost = dbUrl.hostname;
    const dbPort = dbUrl.port || '5432';

    console.log(`\n🔍 Database configuration:`);
    console.log(`   Host: ${dbHost}`);
    console.log(`   Port: ${dbPort}`);
    console.log(`   Database: ${dbName}`);
    console.log(`   User: ${dbUser}`);
    console.log(`\n⚠️  WARNING: This will completely overwrite the database!`);
    console.log(`   Backup file: ${filename}`);
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question('Are you sure you want to continue? (yes/no): ', (answer) => {
        rl.close();
        resolve(answer.toLowerCase());
      });
    });

    if (answer !== 'yes' && answer !== 'y') {
      console.log('Restore cancelled.');
      process.exit(0);
    }

    console.log('\n🔄 Restoring database...');
    
    // Disconnect all connections before restoring
    const disconnectCmd = `PGPASSWORD="${dbPass}" psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${dbName}' AND pid <> pg_backend_pid();"`;
    console.log('Disconnecting existing connections...');
    await execAsync(disconnectCmd, { shell: '/bin/bash' });
    
    // Restore the backup with proper escaping for file path
    const escapedBackupPath = `"${backupPath}"`;
    const restoreCmd = `PGPASSWORD="${dbPass}" psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f ${escapedBackupPath}`;
    console.log(`Executing restore command...`);
    const { stdout, stderr } = await execAsync(restoreCmd, { shell: '/bin/bash' });
    
    if (stderr) {
      console.error(`Restore warning: ${stderr}`);
    }
    
    console.log('\n✅ Database restored successfully!');
    console.log('   You may need to restart your application server.');
    
  } catch (error) {
    console.error('\n❌ Error restoring backup:', error);
    process.exit(1);
  }
}

async function main() {
  console.log('\n📋 Available backups:');
  const backups = await listBackups();
  
  if (backups.length === 0) {
    console.log('No backup files found in the backups directory.');
    process.exit(0);
  }

  // Display available backups
  backups.forEach((file, index) => {
    console.log(`[${index + 1}] ${file}`);
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const selectedIndex = await new Promise<number>((resolve) => {
    rl.question('\nEnter the number of the backup to restore (or press Enter to cancel): ', (answer) => {
      rl.close();
      
      // Handle empty input (user pressed Enter)
      if (!answer.trim()) {
        console.log('Restore cancelled by user.');
        process.exit(0);
      }
      
      const index = parseInt(answer, 10) - 1;
      if (isNaN(index) || index < 0 || index >= backups.length) {
        console.log('Invalid selection. Please enter a valid number.');
        process.exit(1);
      }
      resolve(index);
    });
  });
  
  await restoreBackup(backups[selectedIndex]);
}

// Run the restore process
main().catch(console.error);
