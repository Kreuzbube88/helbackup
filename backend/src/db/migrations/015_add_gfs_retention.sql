-- Add GFS retention columns to targets
ALTER TABLE targets ADD COLUMN retention_scheme TEXT DEFAULT 'simple';
ALTER TABLE targets ADD COLUMN gfs_daily_keep INTEGER DEFAULT 7;
ALTER TABLE targets ADD COLUMN gfs_weekly_keep INTEGER DEFAULT 4;
ALTER TABLE targets ADD COLUMN gfs_monthly_keep INTEGER DEFAULT 12;
