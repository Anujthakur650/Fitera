import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as SQLite from 'expo-sqlite';
import { Alert } from 'react-native';

class DatabaseBackup {
  static async createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `fitera_backup_${timestamp}.db`;
      
      // Get the database file path
      const dbPath = `${FileSystem.documentDirectory}SQLite/strongclone.db`;
      const backupPath = `${FileSystem.documentDirectory}${backupFileName}`;
      
      // Check if database exists
      const dbInfo = await FileSystem.getInfoAsync(dbPath);
      if (!dbInfo.exists) {
        throw new Error('Database file not found');
      }
      
      // Copy database to backup location
      await FileSystem.copyAsync({
        from: dbPath,
        to: backupPath
      });
      
      console.log(`✅ Database backup created: ${backupFileName}`);
      
      // Return backup info
      return {
        success: true,
        backupPath,
        backupFileName,
        timestamp
      };
    } catch (error) {
      console.error('❌ Database backup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  static async shareBackup(backupPath) {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(backupPath);
        return { success: true };
      } else {
        throw new Error('Sharing is not available on this device');
      }
    } catch (error) {
      console.error('❌ Failed to share backup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  static async restoreBackup(backupPath) {
    try {
      // Confirm restoration
      return new Promise((resolve) => {
        Alert.alert(
          'Restore Database',
          'This will replace your current data with the backup. Are you sure?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve({ success: false, cancelled: true }) },
            {
              text: 'Restore',
              style: 'destructive',
              onPress: async () => {
                try {
                  const dbPath = `${FileSystem.documentDirectory}SQLite/strongclone.db`;
                  
                  // Close current database connections
                  await SQLite.closeAsync('strongclone.db');
                  
                  // Replace database with backup
                  await FileSystem.deleteAsync(dbPath, { idempotent: true });
                  await FileSystem.copyAsync({
                    from: backupPath,
                    to: dbPath
                  });
                  
                  console.log('✅ Database restored from backup');
                  resolve({ success: true });
                } catch (error) {
                  console.error('❌ Restore failed:', error);
                  resolve({ success: false, error: error.message });
                }
              }
            }
          ]
        );
      });
    } catch (error) {
      console.error('❌ Restore backup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  static async listBackups() {
    try {
      const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
      const backups = files
        .filter(file => file.startsWith('fitera_backup_') && file.endsWith('.db'))
        .sort((a, b) => b.localeCompare(a)); // Sort by newest first
      
      return {
        success: true,
        backups
      };
    } catch (error) {
      console.error('❌ Failed to list backups:', error);
      return {
        success: false,
        backups: [],
        error: error.message
      };
    }
  }
}

export default DatabaseBackup;
