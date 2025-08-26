#!/bin/bash

# CI/CD Pipeline Health Dashboard - Startup Script
# For Linux and macOS

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is available
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local service_name=$1
    local service_url=$2
    local max_attempts=30
    local attempt=1
    
    print_status "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$service_url" >/dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to start within expected time"
    return 1
}

# Function to check Docker status
check_docker() {
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        print_status "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    print_success "Docker is running"
}

# Function to check Docker Compose
check_docker_compose() {
    if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
        print_error "Docker Compose is not available. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker Compose is available"
}

# Function to check Node.js
check_nodejs() {
    if ! command_exists node; then
        print_warning "Node.js is not installed. Will use Docker containers only."
        return 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2)
    local major_version=$(echo $node_version | cut -d'.' -f1)
    
    if [ "$major_version" -lt 18 ]; then
        print_warning "Node.js version $node_version detected. Version 18+ recommended."
        return 1
    fi
    
    print_success "Node.js $node_version detected"
    return 0
}

# Function to check npm
check_npm() {
    if ! command_exists npm; then
        print_warning "npm is not installed. Will use Docker containers only."
        return 1
    fi
    
    print_success "npm is available"
    return 0
}

# Function to install dependencies
install_dependencies() {
    local has_nodejs=$1
    local has_npm=$2
    
    if [ "$has_nodejs" -eq 0 ] && [ "$has_npm" -eq 0 ]; then
        print_status "Installing dependencies..."
        
        # Install root dependencies
        if [ -f "package.json" ]; then
            print_status "Installing root dependencies..."
            npm install
        fi
        
        # Install backend dependencies
        if [ -d "backend" ] && [ -f "backend/package.json" ]; then
            print_status "Installing backend dependencies..."
            cd backend
            npm install
            cd ..
        fi
        
        # Install frontend dependencies
        if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
            print_status "Installing frontend dependencies..."
            cd frontend
            npm install
            cd ..
        fi
        
        print_success "Dependencies installed successfully"
    else
        print_warning "Skipping dependency installation (Node.js/npm not available)"
    fi
}

# Function to create environment file
create_env_file() {
    if [ ! -f ".env" ]; then
        print_status "Creating .env file..."
        cat > .env << EOF
# Application Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cicd_dashboard
DB_USER=postgres
DB_PASSWORD=password
DATABASE_URL=postgresql://postgres:password@localhost:5432/cicd_dashboard

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here-change-in-production

# GitHub Integration
GITHUB_TOKEN=your-github-personal-access-token
GITHUB_WEBHOOK_SECRET=your-webhook-secret

# Slack Integration
SLACK_WEBHOOK_URL=your-slack-webhook-url

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Logging
LOG_LEVEL=info
EOF
        print_success ".env file created"
        print_warning "Please update the .env file with your actual configuration values"
    else
        print_status ".env file already exists"
    fi
}

# Function to start with Docker
start_with_docker() {
    print_status "Starting services with Docker Compose..."
    
    # Stop any existing containers
    print_status "Stopping existing containers..."
    docker-compose down 2>/dev/null || docker compose down 2>/dev/null || true
    
    # Build and start services
    print_status "Building and starting services..."
    if command_exists docker-compose; then
        docker-compose up -d --build
    else
        docker compose up -d --build
    fi
    
    # Wait for services to be ready
    print_status "Waiting for services to start..."
    sleep 10
    
    # Check service status
    if wait_for_service "PostgreSQL" "http://localhost:5432" 2>/dev/null; then
        print_success "PostgreSQL is running on port 5432"
    fi
    
    if wait_for_service "Redis" "http://localhost:6379" 2>/dev/null; then
        print_success "Redis is running on port 6379"
    fi
    
    if wait_for_service "Backend API" "http://localhost:5000/health" 2>/dev/null; then
        print_success "Backend API is running on http://localhost:5000"
    fi
    
    if wait_for_service "Frontend" "http://localhost:3000" 2>/dev/null; then
        print_success "Frontend is running on http://localhost:3000"
    fi
    
    if wait_for_service "Jenkins" "http://localhost:8083" 2>/dev/null; then
        print_success "Jenkins is running on http://localhost:8083"
    fi
}

# Function to start with Node.js
start_with_nodejs() {
    local has_nodejs=$1
    local has_npm=$2
    
    if [ "$has_nodejs" -eq 0 ] && [ "$has_npm" -eq 0 ]; then
        print_status "Starting services with Node.js..."
        
        # Check if ports are available
        if check_port 5000; then
            print_error "Port 5000 is already in use. Please stop the service using that port."
            exit 1
        fi
        
        if check_port 3000; then
            print_error "Port 3000 is already in use. Please stop the service using that port."
            exit 1
        fi
        
        # Start backend
        print_status "Starting backend server..."
        cd backend
        npm run dev &
        BACKEND_PID=$!
        cd ..
        
        # Wait for backend to start
        sleep 5
        
        # Start frontend
        print_status "Starting frontend application..."
        cd frontend
        npm start &
        FRONTEND_PID=$!
        cd ..
        
        print_success "Services started with Node.js"
        print_status "Backend PID: $BACKEND_PID"
        print_status "Frontend PID: $FRONTEND_PID"
        print_status "Press Ctrl+C to stop all services"
        
        # Wait for interrupt
        trap 'kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit' INT
        wait
    else
        print_error "Cannot start with Node.js (Node.js/npm not available)"
        exit 1
    fi
}

# Function to show service status
show_status() {
    print_status "Service Status:"
    echo "----------------------------------------"
    
    # Check Docker containers
    if command_exists docker; then
        print_status "Docker Containers:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep cicd-dashboard || echo "No containers running"
        echo ""
    fi
    
    # Check ports
    print_status "Port Status:"
    if check_port 5000; then
        echo "✅ Port 5000 (Backend): In use"
    else
        echo "❌ Port 5000 (Backend): Available"
    fi
    
    if check_port 3000; then
        echo "✅ Port 3000 (Frontend): In use"
    else
        echo "❌ Port 3000 (Frontend): Available"
    fi
    
    if check_port 5432; then
        echo "✅ Port 5432 (PostgreSQL): In use"
    else
        echo "❌ Port 5432 (PostgreSQL): Available"
    fi
    
    if check_port 6379; then
        echo "✅ Port 6379 (Redis): In use"
    else
        echo "❌ Port 6379 (Redis): Available"
    fi
    
    if check_port 8083; then
        echo "✅ Port 8083 (Jenkins): In use"
    else
        echo "❌ Port 8083 (Jenkins): Available"
    fi
    echo ""
}

# Function to show help
show_help() {
    echo "CI/CD Pipeline Health Dashboard - Startup Script"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  start           Start the application (default)"
    echo "  stop            Stop all services"
    echo "  restart         Restart all services"
    echo "  status          Show service status"
    echo "  logs            Show service logs"
    echo "  clean           Clean up containers and volumes"
    echo "  help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0              # Start the application"
    echo "  $0 start        # Start the application"
    echo "  $0 status       # Show service status"
    echo "  $0 logs         # Show service logs"
    echo ""
}

# Function to stop services
stop_services() {
    print_status "Stopping all services..."
    
    # Stop Docker containers
    if command_exists docker; then
        docker-compose down 2>/dev/null || docker compose down 2>/dev/null || true
        print_success "Docker services stopped"
    fi
    
    # Stop Node.js processes
    if command_exists pkill; then
        pkill -f "npm run dev" 2>/dev/null || true
        pkill -f "npm start" 2>/dev/null || true
        print_success "Node.js services stopped"
    fi
    
    print_success "All services stopped"
}

# Function to show logs
show_logs() {
    print_status "Showing service logs..."
    
    if command_exists docker; then
        if command_exists docker-compose; then
            docker-compose logs -f
        else
            docker compose logs -f
        fi
    else
        print_error "Docker not available. Cannot show logs."
    fi
}

# Function to clean up
clean_up() {
    print_status "Cleaning up containers and volumes..."
    
    if command_exists docker; then
        # Stop and remove containers
        docker-compose down -v 2>/dev/null || docker compose down -v 2>/dev/null || true
        
        # Remove dangling images
        docker image prune -f 2>/dev/null || true
        
        # Remove unused volumes
        docker volume prune -f 2>/dev/null || true
        
        print_success "Cleanup completed"
    else
        print_error "Docker not available. Cannot clean up."
    fi
}

# Main script logic
main() {
    local action=${1:-start}
    
    case $action in
        start)
            print_status "Starting CI/CD Pipeline Health Dashboard..."
            
            # Check prerequisites
            check_docker
            check_docker_compose
            
            local has_nodejs=0
            local has_npm=0
            check_nodejs && has_nodejs=0 || has_nodejs=1
            check_npm && has_npm=0 || has_npm=1
            
            # Create environment file
            create_env_file
            
            # Install dependencies if Node.js is available
            install_dependencies $has_nodejs $has_npm
            
            # Start services
            start_with_docker
            
            print_success "🎉 CI/CD Pipeline Health Dashboard is starting up!"
            echo ""
            print_status "Services will be available at:"
            echo "  🌐 Frontend: http://localhost:3000"
            echo "  🔌 Backend API: http://localhost:5000"
            echo "  🗄️  PostgreSQL: localhost:5432"
            echo "  🔴 Redis: localhost:6379"
            echo "  🚀 Jenkins: http://localhost:8083"
            echo ""
            print_status "Use '$0 status' to check service status"
            print_status "Use '$0 logs' to view service logs"
            print_status "Use '$0 stop' to stop all services"
            ;;
        stop)
            stop_services
            ;;
        restart)
            stop_services
            sleep 2
            main start
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs
            ;;
        clean)
            clean_up
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown option: $action"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
