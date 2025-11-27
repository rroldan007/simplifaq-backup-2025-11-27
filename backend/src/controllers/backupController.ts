import { Request, Response } from 'express';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { PrismaClient } from '@prisma/client';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

const BACKUP_DIR = path.join(process.cwd(), 'backups');

// Asegurarse de que el directorio de respaldos exista
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export const createBackup = async (req: Request, res: Response): Promise<Response> => {
  let backupPath = '';
  
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupName = `backup-${timestamp}.sql`;
    backupPath = path.join(BACKUP_DIR, backupName);
    
    // Ensure backup directory exists with proper permissions
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o755 });
      console.log(`Created backup directory: ${BACKUP_DIR}`);
    }

    // Verify directory is writable
    try {
      await fs.promises.access(BACKUP_DIR, fs.constants.W_OK);
    } catch (err) {
      console.error(`Backup directory is not writable: ${BACKUP_DIR}`);
      throw new Error(`Backup directory is not writable: ${BACKUP_DIR}`);
    }

    // Get database configuration from environment
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    if (dbUrl.startsWith('file:')) {
      // SQLite database
      const dbPath = path.resolve(dbUrl.replace(/^file:/, ''));
      
      if (!fs.existsSync(dbPath)) {
        throw new Error(`Database file not found at ${dbPath}`);
      }
      
      // Copy the SQLite database file
      await fs.promises.copyFile(dbPath, backupPath);
      console.log(`Created SQLite backup at: ${backupPath}`);
    } else if (dbUrl.startsWith('postgresql://')) {
      // PostgreSQL database
      const dbUrlObj = new URL(dbUrl);
      const dbName = dbUrlObj.pathname.replace(/^\/+/, '');
      const dbUser = dbUrlObj.username;
      const dbPass = dbUrlObj.password;
      const dbHost = dbUrlObj.hostname;
      const dbPort = dbUrlObj.port || '5432';

      // Command to create the backup
      const cmd = `PGPASSWORD="${dbPass}" pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f ${backupPath}`;
      console.log(`Executing: ${cmd.replace(/PGPASSWORD=".*?"/, 'PGPASSWORD="*****"')}`);
      
      try {
        const { stdout, stderr } = await execAsync(cmd);
        if (stderr) {
          console.error(`pg_dump stderr: ${stderr}`);
        }
        console.log(`Created PostgreSQL backup at: ${backupPath}`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error executing pg_dump';
        console.error('Error executing pg_dump:', errorMessage);
        throw new Error(`Failed to create PostgreSQL backup: ${errorMessage}`);
      }
    } else {
      throw new Error('Unsupported database type in DATABASE_URL');
    }

    // Verify backup was created and is accessible
    try {
      const stats = await fs.promises.stat(backupPath);
      if (stats.size === 0) {
        throw new Error('Backup file is empty');
      }
      
      // Set permissions to ensure the file is readable
      await fs.promises.chmod(backupPath, 0o644);
      
      return res.json({
        success: true,
        message: 'Backup created successfully',
        filename: backupName,
        path: backupPath,
        size: stats.size,
        timestamp: new Date().toISOString()
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error during backup verification';
      console.error('Error verifying backup:', errorMessage);
      throw new Error(`Backup verification failed: ${errorMessage}`);
    }
  } catch (error) {
    console.error('Error creating backup:', error);
    
    // Clean up any partially created backup file
    if (backupPath && fs.existsSync(backupPath)) {
      try {
        await fs.promises.unlink(backupPath);
      } catch (cleanupError) {
        console.error('Error cleaning up failed backup:', cleanupError);
      }
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorDetails = process.env.NODE_ENV === 'development' ? 
      (error instanceof Error ? error.stack : String(error)) : 
      'Check server logs for details';
      
    return res.status(500).json({
      success: false,
      error: 'Failed to create database backup',
      message: errorMessage,
      details: errorDetails
    });
  }
};

export const listBackups = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      return res.json({ success: true, data: [] });
    }
    
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.endsWith('.sql') || file.endsWith('.db'))
      .map(file => {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          path: filePath,
          size: stats.size,
          createdAt: stats.birthtime,
          downloadUrl: `/api/backups/download/${file}`
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return res.json({
      success: true,
      data: files
    });
  } catch (error) {
    console.error('Error al listar respaldos:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al listar los respaldos',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};

export const restoreBackup = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { filename } = req.params;
    const backupPath = path.join(BACKUP_DIR, filename);
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({
        success: false,
        error: 'El archivo de respaldo no existe'
      });
    }

    // Obtener configuración de la base de datos
    const dbUrl = new URL(process.env.DATABASE_URL || '');
    const dbName = dbUrl.pathname.replace(/^\/+/, '');
    const dbUser = dbUrl.username;
    const dbPass = dbUrl.password;
    const dbHost = dbUrl.hostname;
    const dbPort = dbUrl.port || '5432';

    // Primero desconectar todos los clientes
    await prisma.$executeRaw`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = ${dbName}
        AND pid <> pg_backend_pid();
    `;

    // Restaurar el respaldo
    const cmd = `PGPASSWORD="${dbPass}" psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f ${backupPath}`;
    await execAsync(cmd);

    res.json({
      success: true,
      message: 'Base de datos restaurada exitosamente',
      filename,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error al restaurar respaldo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al restaurar la base de datos',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};

export const deleteBackup = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { filename } = req.params;
    const backupPath = path.join(BACKUP_DIR, filename);
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({
        success: false,
        error: 'El archivo de respaldo no existe'
      });
    }

    fs.unlinkSync(backupPath);

    res.json({
      success: true,
      message: 'Respaldo eliminado exitosamente',
      filename
    });
  } catch (error) {
    console.error('Error al eliminar respaldo:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar el respaldo',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};
