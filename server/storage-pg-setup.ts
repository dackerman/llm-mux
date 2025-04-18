import { storage as memStorage } from './storage';
import { PostgresStorage } from './storage-pg';
import { runMigrations } from './migrations';
import { initDatabase } from './db';
import { IStorage } from './storage';

// Export a variable that will hold our storage implementation
export let storage: IStorage = memStorage;

/**
 * Initialize PostgreSQL database and set up the PostgresStorage as the storage provider
 */
export async function initPostgresStorage() {
  console.log('Initializing PostgreSQL storage...');
  
  try {
    // Run database migrations
    await runMigrations();
    
    // Initialize database connection
    await initDatabase();
    
    // Create and replace storage with PostgresStorage
    const pgStorage = new PostgresStorage();
    
    // Update the exported storage variable
    storage = pgStorage;
    
    console.log('PostgreSQL storage initialized successfully');
    
    return true;
  } catch (error) {
    console.error('Failed to initialize PostgreSQL storage:', error);
    throw error;
  }
}