#!/bin/sh
# HELBACKUP Password Reset
# Run: docker exec helbackup /app/scripts/reset-password.sh

set -e

echo "HELBACKUP Password Reset"
echo ""

NEW_PASSWORD=$(openssl rand -base64 12)
HASH=$(node -e "
const bcrypt = require('bcryptjs');
bcrypt.hash('$NEW_PASSWORD', 10).then(h => process.stdout.write(h));
")

sqlite3 /app/data/helbackup.db "UPDATE admin SET password_hash = '$HASH' WHERE id = 1"

echo "Password reset successful!"
echo ""
echo "New temporary password: $NEW_PASSWORD"
echo ""
echo "Login and change this password immediately!"
