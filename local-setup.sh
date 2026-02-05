#!/bin/bash
set -e

echo "🚀 Setting up SimOS locally..."

# Navigate to project directory
cd ~/SimOS

# Create .env file
echo "📝 Creating .env file..."
cat > .env << 'EOF'
DATABASE_URL=postgresql://adamlinkenauger@localhost:5432/simos_dev
REPLIT_AUTH_ENABLED=false
SESSION_SECRET=development_secret_key_change_in_production
PORT=5001
EOF

echo "✅ .env file created"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Set up PostgreSQL path
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"

# Check if PostgreSQL is running
echo "🔍 Checking PostgreSQL..."
if ! pg_isready -q 2>/dev/null; then
  echo "⚠️  PostgreSQL not running, starting it..."
  brew services start postgresql@15
  sleep 2
fi

# Create database if it doesn't exist
echo "🗄️  Setting up database..."
psql postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'simos_dev'" | grep -q 1 || createdb simos_dev
echo "✅ Database ready"

# Push schema
echo "📋 Creating database tables..."
npm run db:push

# Seed database
echo "🌱 Creating test user..."
npm run db:seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎉 You can now run: npm run dev"
echo "Then open: http://localhost:5001/login"
echo ""
echo "Test credentials:"
echo "  Email: test@example.com"
echo "  Password: password123"
echo ""
