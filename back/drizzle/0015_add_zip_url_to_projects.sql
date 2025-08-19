-- Migration: Add zipUrl column to projects table
ALTER TABLE "projects" ADD COLUMN "zip_url" text;
