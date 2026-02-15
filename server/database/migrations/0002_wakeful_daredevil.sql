CREATE TABLE "plaid_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plaid_item_id" integer NOT NULL,
	"account_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"official_name" varchar(255),
	"mask" varchar(10),
	"type" varchar(50) NOT NULL,
	"subtype" varchar(50),
	"current_balance" numeric(12, 2),
	"available_balance" numeric(12, 2),
	"iso_currency_code" varchar(10),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plaid_accounts_account_id_unique" UNIQUE("account_id")
);
--> statement-breakpoint
CREATE TABLE "plaid_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"item_id" varchar(255) NOT NULL,
	"encrypted_access_token" text NOT NULL,
	"institution_id" varchar(100),
	"institution_name" varchar(255),
	"status" varchar(50) DEFAULT 'healthy' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plaid_items_item_id_unique" UNIQUE("item_id")
);
--> statement-breakpoint
CREATE TABLE "sync_cursors" (
	"id" serial PRIMARY KEY NOT NULL,
	"plaid_item_id" integer NOT NULL,
	"cursor" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sync_cursors_plaid_item_id_unique" UNIQUE("plaid_item_id")
);
--> statement-breakpoint
ALTER TABLE "plaid_accounts" ADD CONSTRAINT "plaid_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plaid_accounts" ADD CONSTRAINT "plaid_accounts_plaid_item_id_plaid_items_id_fk" FOREIGN KEY ("plaid_item_id") REFERENCES "public"."plaid_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plaid_items" ADD CONSTRAINT "plaid_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_cursors" ADD CONSTRAINT "sync_cursors_plaid_item_id_plaid_items_id_fk" FOREIGN KEY ("plaid_item_id") REFERENCES "public"."plaid_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plaid_accounts_user_id_idx" ON "plaid_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "plaid_accounts_plaid_item_id_idx" ON "plaid_accounts" USING btree ("plaid_item_id");--> statement-breakpoint
CREATE INDEX "plaid_items_user_id_idx" ON "plaid_items" USING btree ("user_id");