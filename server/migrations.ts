import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

// Create migration function
export async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
  }

  // Initialize connection
  const migrationConnection = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(migrationConnection);
  
  console.log('Running migrations...');
  
  // Run the migrations
  try {
    // Using drizzle folder for migrations
    await migrate(db, { 
      migrationsFolder: './drizzle' 
    });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await migrationConnection.end();
  }
}

// ES modules don't have require.main, so we'll just export the function
export async function runMigrationsScript() {
  try {
    await runMigrations();
    console.log('Migration script completed');
    return true;
  } catch (err) {
    console.error('Migration script failed:', err);
    throw err;
  }
}