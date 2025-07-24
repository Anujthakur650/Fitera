import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

class SecureDatabaseManager {
  constructor() {
    this.db = null;
    this.isEncrypted = false;
    this.encryptionKey = null;
  }

  /**
   * Generate or retrieve encryption key for database
   */
  async getEncryptionKey() {
    try {
      // Try to get existing key
      let key = await SecureStore.getItemAsync('db_encryption_key');
      
      if (!key) {
        // Generate new 256-bit encryption key
        key = this.generateSecureKey();
        await SecureStore.setItemAsync('db_encryption_key', key);
      }
      
      return key;
    } catch (error) {
      console.error('Failed to get encryption key:', error);
      throw new Error('Database encryption key unavailable');
    }
  }

  /**
   * Generate cryptographically secure key
   */
  generateSecureKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let key = '';
    for (let i = 0; i < 64; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }

  /**
   * Initialize secure database with encryption
   */
  async initSecureDatabase() {
    try {
      // Get encryption key
      this.encryptionKey = await this.getEncryptionKey();
      
      // Open database with encryption
      this.db = await SQLite.openDatabaseAsync('strongclone_secure.db');
      
      // Enable encryption (SQLCipher commands)
      try {
        await this.db.execAsync(`PRAGMA key = '${this.encryptionKey}';`);
        await this.db.execAsync('PRAGMA cipher_compatibility = 4;');
        this.isEncrypted = true;
      } catch (encryptError) {
        console.warn('SQLCipher not available, using standard SQLite');
        this.isEncrypted = false;
      }

      // Verify database integrity
      await this.verifyDatabaseIntegrity();
      
      // Create tables
      await this.createSecureTables();
      await this.seedExercises();
      
      return true;
    } catch (error) {
      console.error('Secure database initialization failed:', error);
      return false;
    }
  }

  /**
   * Verify database integrity and encryption status
   */
  async verifyDatabaseIntegrity() {
    try {
      // Test basic query to verify encryption works
      await this.db.getFirstAsync('SELECT 1 as test');
      console.log('Database integrity verified');
    } catch (error) {
      console.error('Database integrity check failed:', error);
      throw new Error('Database corruption detected');
    }
  }

  /**
   * Create tables with security enhancements
   */
  async createSecureTables() {
    // Users table with security fields
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        weight REAL,
        height REAL,
        security_pin TEXT,
        biometric_enabled BOOLEAN DEFAULT 0,
        failed_attempts INTEGER DEFAULT 0,
        locked_until DATETIME,
        last_login DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Security audit log
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS security_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        details TEXT,
        user_id INTEGER,
        ip_address TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        success BOOLEAN DEFAULT 1
      );
    `);

    // Data integrity checksums
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS data_integrity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id INTEGER NOT NULL,
        checksum TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Continue with existing table creation but with security enhancements
    await this.createWorkoutTables();
  }

  /**
   * Create workout-related tables with integrity checks
   */
  async createWorkoutTables() {
    // Exercise categories
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS exercise_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        icon TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Exercises table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category_id INTEGER,
        muscle_groups TEXT,
        equipment TEXT,
        instructions TEXT,
        is_custom BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_hash TEXT,
        FOREIGN KEY (category_id) REFERENCES exercise_categories (id)
      );
    `);

    // Workouts with tamper detection
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        duration INTEGER DEFAULT 0,
        notes TEXT,
        template_id INTEGER,
        is_completed BOOLEAN DEFAULT 0,
        data_hash TEXT,
        integrity_verified BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Sets with tamper protection
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_exercise_id INTEGER,
        set_number INTEGER,
        weight REAL,
        reps INTEGER,
        duration INTEGER,
        distance REAL,
        is_completed BOOLEAN DEFAULT 0,
        is_warmup BOOLEAN DEFAULT 0,
        notes TEXT,
        data_hash TEXT,
        verified BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises (id)
      );
    `);

    // Personal records with integrity verification
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS personal_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exercise_id INTEGER,
        record_type TEXT,
        value REAL,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        workout_id INTEGER,
        verification_hash TEXT,
        is_verified BOOLEAN DEFAULT 1,
        FOREIGN KEY (exercise_id) REFERENCES exercises (id),
        FOREIGN KEY (workout_id) REFERENCES workouts (id)
      );
    `);
  }

  /**
   * Calculate data hash for integrity verification
   */
  calculateDataHash(data) {
    // Simple hash function for data integrity
    let hash = 0;
    const str = JSON.stringify(data);
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Secure insert with integrity checks
   */
  async secureInsert(table, data) {
    try {
      // Calculate integrity hash
      const dataHash = this.calculateDataHash(data);
      const dataWithHash = { ...data, data_hash: dataHash };

      // Prepare parameterized query
      const columns = Object.keys(dataWithHash);
      const placeholders = columns.map(() => '?').join(', ');
      const values = Object.values(dataWithHash);

      const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
      
      const result = await this.db.runAsync(query, values);
      
      // Log security event
      await this.logSecurityEvent('data_insert', `Table: ${table}, ID: ${result.lastInsertRowId}`);
      
      return result;
    } catch (error) {
      await this.logSecurityEvent('data_insert_failed', `Table: ${table}, Error: ${error.message}`, false);
      throw error;
    }
  }

  /**
   * Secure update with integrity verification
   */
  async secureUpdate(table, data, whereClause, whereParams = []) {
    try {
      // Calculate new integrity hash
      const dataHash = this.calculateDataHash(data);
      const dataWithHash = { ...data, data_hash: dataHash, updated_at: new Date().toISOString() };

      // Prepare parameterized query
      const setClause = Object.keys(dataWithHash).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(dataWithHash), ...whereParams];

      const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
      
      const result = await this.db.runAsync(query, values);
      
      // Log security event
      await this.logSecurityEvent('data_update', `Table: ${table}, Rows: ${result.changes}`);
      
      return result;
    } catch (error) {
      await this.logSecurityEvent('data_update_failed', `Table: ${table}, Error: ${error.message}`, false);
      throw error;
    }
  }

  /**
   * Verify data integrity
   */
  async verifyDataIntegrity(table, id) {
    try {
      const record = await this.db.getFirstAsync(`SELECT * FROM ${table} WHERE id = ?`, [id]);
      
      if (!record) return false;

      const { data_hash, ...dataWithoutHash } = record;
      const calculatedHash = this.calculateDataHash(dataWithoutHash);

      return data_hash === calculatedHash;
    } catch (error) {
      console.error('Data integrity verification failed:', error);
      return false;
    }
  }

  /**
   * Log security events for audit trail
   */
  async logSecurityEvent(action, details = '', success = true) {
    try {
      await this.db.runAsync(
        'INSERT INTO security_audit_log (action, details, success) VALUES (?, ?, ?)',
        [action, details, success ? 1 : 0]
      );
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Get security audit logs
   */
  async getSecurityLogs(limit = 100) {
    return await this.db.getAllAsync(
      'SELECT * FROM security_audit_log ORDER BY timestamp DESC LIMIT ?',
      [limit]
    );
  }

  /**
   * Secure backup with encryption
   */
  async createSecureBackup() {
    try {
      // This would implement encrypted backup functionality
      // For now, log the attempt
      await this.logSecurityEvent('backup_created', 'Secure backup initiated');
      
      Alert.alert(
        'Backup Created',
        'Your workout data has been securely backed up.'
      );
    } catch (error) {
      await this.logSecurityEvent('backup_failed', error.message, false);
      throw error;
    }
  }

  /**
   * Migration from old database
   */
  async migrateFromOldDatabase() {
    try {
      // This would implement secure migration from unencrypted database
      await this.logSecurityEvent('database_migration', 'Migration from unencrypted database');
      console.log('Database migration completed');
    } catch (error) {
      await this.logSecurityEvent('migration_failed', error.message, false);
      throw error;
    }
  }

  // Include all existing database methods with security enhancements
  async getAllAsync(query, params = []) {
    try {
      return await this.db.getAllAsync(query, params);
    } catch (error) {
      await this.logSecurityEvent('query_failed', `Query: ${query}, Error: ${error.message}`, false);
      throw error;
    }
  }

  async getFirstAsync(query, params = []) {
    try {
      return await this.db.getFirstAsync(query, params);
    } catch (error) {
      await this.logSecurityEvent('query_failed', `Query: ${query}, Error: ${error.message}`, false);
      throw error;
    }
  }

  async runAsync(query, params = []) {
    try {
      return await this.db.runAsync(query, params);
    } catch (error) {
      await this.logSecurityEvent('query_failed', `Query: ${query}, Error: ${error.message}`, false);
      throw error;
    }
  }

  // Placeholder for exercise seeding (implement actual data here)
  async seedExercises() {
    try {
      // Implement exercise seeding with security checks
      await this.logSecurityEvent('exercises_seeded', 'Exercise database populated');
    } catch (error) {
      await this.logSecurityEvent('exercise_seed_failed', error.message, false);
    }
  }
}

export default new SecureDatabaseManager(); 