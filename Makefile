# Makefile — root of your monorepo
# Usage:
#   make dev          # start Supabase (if needed), wait for it, then start Expo
#   make stop         # stop Expo (Ctrl+C) then stop Supabase containers
#   make down         # force stop & remove Supabase containers/volumes
#   make logs         # tail Supabase logs
#   make test         # run your tests
#   make ios / android / web  # open Expo in a specific platform
#
# Adjust the APP_PATH and EXPO_CMD to match your repo.

SHELL := bash
.ONESHELL:
.SILENT:

# ---- Config: tweak these for your repo ----
APP_PATH ?= app          # where your Expo app lives
PKG ?= npm                    # or npm / yarn
EXPO_CMD ?= npm start  # e.g. 'expo start' or '$(PKG) --filter apps/expo dev'

# Supabase defaults (local)
SUPABASE_API_HOST ?= 127.0.0.1
SUPABASE_API_PORT ?= 54321
SUPABASE_HEALTH_URL ?= http://$(SUPABASE_API_HOST):$(SUPABASE_API_PORT)/functions/v1/health

# ---- Helpers ----
define need
	@command -v $(1) >/dev/null 2>&1 || { echo "✖ Required command '$(1)' not found in PATH"; exit 127; }
endef

# ---- Targets ----

.PHONY: dev supabase-up expo stop down logs status seed reset test ios android web lint format

help:
	@echo "dev: start Supabase (if needed), wait for it, then start Expo"
	@echo "supabase-up: start Supabase (if not already running)"
	@echo "expo: start Expo"
	@echo "stop: stop Expo"
	@echo "down: stop Supabase containers and volumes"
	@echo "logs: tail Supabase logs"
	@echo "status: check Supabase status"
	@echo "seed: run your local seed script against Supabase (adjust as needed)"
	@echo "reset: stop Supabase and reset it"
	@echo "test: run your tests"
	@echo "lint: run your linting"
	@echo "format: run your formatting"
	@echo "ios: start Expo in iOS"
	@echo "android: start Expo in Android"
	@echo "web: start Expo in Web"


dev: supabase-up expo

supabase-up:
	$(call need,supabase)
	echo "▶ Starting Supabase (if not already running)…"
	# supabase start is idempotent; if running, it will no-op
	supabase start >/dev/null
	echo "✓ Supabase command issued."

expo:
	# Use your package manager to start Expo from the monorepo root,
	# or cd into the app folder and run expo directly.
	echo "▶ Starting Expo dev server…"
	$(EXPO_CMD)

stop:
	$(call need,supabase)
	echo "▶ Stopping Supabase containers…"
	supabase stop || true
	echo "✓ Supabase stopped."

down:
	$(call need,supabase)
	echo "▶ Stopping & removing Supabase containers and volumes…"
	supabase stop
	echo "✓ Supabase removed."

logs:
	$(call need,supabase)
	# Follow Supabase logs (Ctrl+C to exit)
	supabase logs -f

status:
	$(call need,supabase)
	supabase status || true

seed:
	# Example: run your local seed script against Supabase (adjust as needed)
	# $(PKG) --filter @repo/scripts seed:local
	echo "Add your seed command here."

reset: down supabase-up
	@true

test:
	# Adjust to your test runner
	$(PKG) test -w

lint:
	$(PKG) lint -w

format:
	$(PKG) format -w

ios:
	$(EXPO_CMD) --ios

android:
	$(EXPO_CMD) --android

web:
	$(EXPO_CMD) --web

create-development-build:
	eas build --profile development

create-preview-build:
	eas build --profile preview

create-production-build:
	eas build --profile production
	