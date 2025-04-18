-- Migration file for the turns table
-- Other tables already exist
CREATE TABLE "turns" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "chat_id" integer NOT NULL,
        "parent_turn_id" uuid,
        "branch_id" text NOT NULL,
        "role" text NOT NULL,
        "model" text,
        "content" text NOT NULL,
        "timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "turns" ADD CONSTRAINT "turns_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE no action ON UPDATE no action;