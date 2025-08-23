/**
 * Sample class for testing code analysis
 */
class DatabaseManager {
  constructor(config) {
    this.config = config;
    this.connections = new Map();
    this.isConnected = false;
  }

  async connect() {
    try {
      this.isConnected = true;
      console.log('Connected to database');
      return true;
    } catch (error) {
      console.error('Connection failed:', error);
      throw error;
    }
  }

  async query(sql, params = []) {
    if (!this.isConnected) {
      throw new Error('Not connected to database');
    }

    // Mock query execution
    return { rows: [], rowCount: 0 };
  }

  disconnect() {
    this.isConnected = false;
    this.connections.clear();
  }

  static create(config) {
    return new DatabaseManager(config);
  }
}

module.exports = DatabaseManager;