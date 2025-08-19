-- Migration: Add conversation and fiche columns to projects table
ALTER TABLE "projects" ADD COLUMN "conversation" text;
ALTER TABLE "projects" ADD COLUMN "fiche" text;
