CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" serial PRIMARY KEY NOT NULL,
  "provider" text UNIQUE NOT NULL,
  "api_key" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY NOT NULL,
  "username" text NOT NULL,
  "password_hash" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "chats" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "messages" (
  "id" serial PRIMARY KEY NOT NULL,
  "chat_id" integer NOT NULL,
  "content" text NOT NULL,
  "role" text NOT NULL,
  "model_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "messages_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "chats" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_username_idx" ON "users" ("username");