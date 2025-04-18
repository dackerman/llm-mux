import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';

// Create PostgreSQL connection
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}
const queryClient = postgres(process.env.DATABASE_URL);

// Create Drizzle ORM instance
export const db = drizzle(queryClient, { schema });

// Function to initialize database tables
export async function initDatabase() {
  try {
    // Test connection
    const result = await queryClient`SELECT NOW()`;
    console.log('Connected to PostgreSQL database');
    
    // Tables will be created by Drizzle migrations
    console.log('Database initialized');
    return true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}