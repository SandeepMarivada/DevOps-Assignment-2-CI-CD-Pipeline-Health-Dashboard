@echo off
setlocal enabledelayedexpansion

REM CI/CD Pipeline Health Dashboard - Startup Script
REM For Windows

REM Set title
title CI/CD Pipeline Health Dashboard - Startup Script

REM Colors for output (Windows 10+)
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM Function to print colored output
:print_status
echo %BLUE%[INFO]%NC% %~1
goto :eof

:print_success
echo %GREEN%[SUCCESS]%NC% %~1
goto :eof

:print_warning
echo %YELLOW%[WARNING]%NC% %~1
goto :eof

:print_error
echo %RED%[ERROR]%NC% %~1
goto :eof

REM Function to check if command exists
:command_exists
where %1 >nul 2>&1
if %errorlevel% equ 0 (
    set "exists=1"
) else (
    set "exists=0"
)
goto :eof

REM Function to check if port is available
:check_port
netstat -an | find ":%1 " | find "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    set "port_in_use=1"
) else (
    set "port_in_use=0"
)
goto :eof

REM Function to wait for service to be ready
:wait_for_service
set "service_name=%~1"
set "service_url=%~2"
set "max_attempts=30"
set "attempt=1"

call :print_status "Waiting for %service_name% to be ready..."

:wait_loop
curl -s "%service_url%" >nul 2>&1
if %errorlevel% equ 0 (
    call :print_success "%service_name% is ready!"
    goto :eof
)

echo -n .
timeout /t 2 /nobreak >nul
set /a attempt+=1
if %attempt% leq %max_attempts% goto wait_loop

call :print_error "%service_name% failed to start within expected time"
goto :eof

REM Function to check Docker status
:check_docker
call :command_exists docker
if "%exists%"=="0" (
    call :print_error "Docker is not installed. Please install Docker first."
    call :print_status "Visit: https://docs.docker.com/get-docker/"
    exit /b 1
)

docker info >nul 2>&1
if %errorlevel% neq 0 (
    call :print_error "Docker is not running. Please start Docker first."
    exit /b 1
)

call :print_success "Docker is running"
goto :eof

REM Function to check Docker Compose
:check_docker_compose
call :command_exists docker-compose
if "%exists%"=="1" (
    call :print_success "Docker Compose is available"
    goto :eof
)

docker compose version >nul 2>&1
if %errorlevel% equ 0 (
    call :print_success "Docker Compose is available"
    goto :eof
)

call :print_error "Docker Compose is not available. Please install Docker Compose first."
exit /b 1

REM Function to check Node.js
:check_nodejs
call :command_exists node
if "%exists%"=="0" (
    call :print_warning "Node.js is not installed. Will use Docker containers only."
    set "has_nodejs=0"
    goto :eof
)

for /f "tokens=*" %%i in ('node --version') do set "node_version=%%i"
set "node_version=%node_version:~1%"
for /f "tokens=1 delims=." %%a in ("%node_version%") do set "major_version=%%a"

if %major_version% lss 18 (
    call :print_warning "Node.js version %node_version% detected. Version 18+ recommended."
    set "has_nodejs=0"
    goto :eof
)

call :print_success "Node.js %node_version% detected"
set "has_nodejs=1"
goto :eof

REM Function to check npm
:check_npm
call :command_exists npm
if "%exists%"=="0" (
    call :print_warning "npm is not installed. Will use Docker containers only."
    set "has_npm=0"
    goto :eof
)

call :print_success "npm is available"
set "has_npm=1"
goto :eof

REM Function to install dependencies
:install_dependencies
if "%has_nodejs%"=="1" if "%has_npm%"=="1" (
    call :print_status "Installing dependencies..."
    
    REM Install root dependencies
    if exist "package.json" (
        call :print_status "Installing root dependencies..."
        call npm install
    )
    
    REM Install backend dependencies
    if exist "backend\package.json" (
        call :print_status "Installing backend dependencies..."
        cd backend
        call npm install
        cd ..
    )
    
    REM Install frontend dependencies
    if exist "frontend\package.json" (
        call :print_status "Installing frontend dependencies..."
        cd frontend
        call npm install
        cd ..
    )
    
    call :print_success "Dependencies installed successfully"
) else (
    call :print_warning "Skipping dependency installation (Node.js/npm not available)"
)
goto :eof

REM Function to create environment file
:create_env_file
if not exist ".env" (
    call :print_status "Creating .env file..."
    (
        echo # Application Configuration
        echo NODE_ENV=development
        echo PORT=5000
        echo FRONTEND_URL=http://localhost:3000
        echo.
        echo # Database Configuration
        echo DB_HOST=localhost
        echo DB_PORT=5432
        echo DB_NAME=cicd_dashboard
        echo DB_USER=postgres
        echo DB_PASSWORD=password
        echo DATABASE_URL=postgresql://postgres:password@localhost:5432/cicd_dashboard
        echo.
        echo # Redis Configuration
        echo REDIS_URL=redis://localhost:6379
        echo.
        echo # JWT Configuration
        echo JWT_SECRET=your-super-secret-jwt-key-here-change-in-production
        echo JWT_REFRESH_SECRET=your-super-secret-refresh-key-here-change-in-production
        echo.
        echo # GitHub Integration
        echo GITHUB_TOKEN=your-github-personal-access-token
        echo GITHUB_WEBHOOK_SECRET=your-webhook-secret
        echo.
        echo # Slack Integration
        echo SLACK_WEBHOOK_URL=your-slack-webhook-url
        echo.
        echo # Email Configuration ^(SMTP^)
        echo SMTP_HOST=smtp.gmail.com
        echo SMTP_PORT=587
        echo SMTP_USER=your-email@gmail.com
        echo SMTP_PASS=your-app-password
        echo.
        echo # Logging
        echo LOG_LEVEL=info
    ) > .env
    call :print_success ".env file created"
    call :print_warning "Please update the .env file with your actual configuration values"
) else (
    call :print_status ".env file already exists"
)
goto :eof

REM Function to start with Docker
:start_with_docker
call :print_status "Starting services with Docker Compose..."

REM Stop any existing containers
call :print_status "Stopping existing containers..."
docker-compose down >nul 2>&1 || docker compose down >nul 2>&1 || echo.

REM Build and start services
call :print_status "Building and starting services..."
call :command_exists docker-compose
if "%exists%"=="1" (
    docker-compose up -d --build
) else (
    docker compose up -d --build
)

REM Wait for services to start
call :print_status "Waiting for services to start..."
timeout /t 10 /nobreak >nul

REM Check service status
call :wait_for_service "PostgreSQL" "http://localhost:5432" >nul 2>&1 && (
    call :print_success "PostgreSQL is running on port 5432"
)

call :wait_for_service "Redis" "http://localhost:6379" >nul 2>&1 && (
    call :print_success "Redis is running on port 6379"
)

call :wait_for_service "Backend API" "http://localhost:5000/health" >nul 2>&1 && (
    call :print_success "Backend API is running on http://localhost:5000"
)

call :wait_for_service "Frontend" "http://localhost:3000" >nul 2>&1 && (
    call :print_success "Frontend is running on http://localhost:3000"
)

call :wait_for_service "Jenkins" "http://localhost:8083" >nul 2>&1 && (
    call :print_success "Jenkins is running on http://localhost:8083"
)
goto :eof

REM Function to start with Node.js
:start_with_nodejs
if "%has_nodejs%"=="1" if "%has_npm%"=="1" (
    call :print_status "Starting services with Node.js..."
    
    REM Check if ports are available
    call :check_port 5000
    if "%port_in_use%"=="1" (
        call :print_error "Port 5000 is already in use. Please stop the service using that port."
        exit /b 1
    )
    
    call :check_port 3000
    if "%port_in_use%"=="1" (
        call :print_error "Port 3000 is already in use. Please stop the service using that port."
        exit /b 1
    )
    
    REM Start backend
    call :print_status "Starting backend server..."
    cd backend
    start "Backend Server" cmd /c "npm run dev"
    cd ..
    
    REM Wait for backend to start
    timeout /t 5 /nobreak >nul
    
    REM Start frontend
    call :print_status "Starting frontend application..."
    cd frontend
    start "Frontend App" cmd /c "npm start"
    cd ..
    
    call :print_success "Services started with Node.js"
    call :print_status "Backend and Frontend are running in separate windows"
    call :print_status "Close those windows to stop the services"
    
    pause
) else (
    call :print_error "Cannot start with Node.js (Node.js/npm not available)"
    exit /b 1
)
goto :eof

REM Function to show service status
:show_status
call :print_status "Service Status:"
echo ----------------------------------------

REM Check Docker containers
call :command_exists docker
if "%exists%"=="1" (
    call :print_status "Docker Containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | findstr cicd-dashboard || echo No containers running
    echo.
)

REM Check ports
call :print_status "Port Status:"
call :check_port 5000
if "%port_in_use%"=="1" (
    echo ✅ Port 5000 ^(Backend^): In use
) else (
    echo ❌ Port 5000 ^(Backend^): Available
)

call :check_port 3000
if "%port_in_use%"=="1" (
    echo ✅ Port 3000 ^(Frontend^): In use
) else (
    echo ❌ Port 3000 ^(Frontend^): Available
)

call :check_port 5432
if "%port_in_use%"=="1" (
    echo ✅ Port 5432 ^(PostgreSQL^): In use
) else (
    echo ❌ Port 5432 ^(PostgreSQL^): Available
)

call :check_port 6379
if "%port_in_use%"=="1" (
    echo ✅ Port 6379 ^(Redis^): In use
) else (
    echo ❌ Port 6379 ^(Redis^): Available
)

call :check_port 8083
if "%port_in_use%"=="1" (
    echo ✅ Port 8083 ^(Jenkins^): In use
) else (
    echo ❌ Port 8083 ^(Jenkins^): Available
)
echo.
goto :eof

REM Function to show help
:show_help
echo CI/CD Pipeline Health Dashboard - Startup Script
echo.
echo Usage: %~nx0 [OPTION]
echo.
echo Options:
echo   start           Start the application ^(default^)
echo   stop            Stop all services
echo   restart         Restart all services
echo   status          Show service status
echo   logs            Show service logs
echo   clean           Clean up containers and volumes
echo   help            Show this help message
echo.
echo Examples:
echo   %~nx0              # Start the application
echo   %~nx0 start        # Start the application
echo   %~nx0 status       # Show service status
echo   %~nx0 logs         # Show service logs
echo.
goto :eof

REM Function to stop services
:stop_services
call :print_status "Stopping all services..."

REM Stop Docker containers
call :command_exists docker
if "%exists%"=="1" (
    docker-compose down >nul 2>&1 || docker compose down >nul 2>&1 || echo.
    call :print_success "Docker services stopped"
)

REM Stop Node.js processes (Windows specific)
tasklist /fi "imagename eq node.exe" >nul 2>&1
if %errorlevel% equ 0 (
    taskkill /f /im node.exe >nul 2>&1
    call :print_success "Node.js services stopped"
)

call :print_success "All services stopped"
goto :eof

REM Function to show logs
:show_logs
call :print_status "Showing service logs..."

call :command_exists docker
if "%exists%"=="1" (
    call :command_exists docker-compose
    if "%exists%"=="1" (
        docker-compose logs -f
    ) else (
        docker compose logs -f
    )
) else (
    call :print_error "Docker not available. Cannot show logs."
)
goto :eof

REM Function to clean up
:clean_up
call :print_status "Cleaning up containers and volumes..."

call :command_exists docker
if "%exists%"=="1" (
    REM Stop and remove containers
    docker-compose down -v >nul 2>&1 || docker compose down -v >nul 2>&1 || echo.
    
    REM Remove dangling images
    docker image prune -f >nul 2>&1 || echo.
    
    REM Remove unused volumes
    docker volume prune -f >nul 2>&1 || echo.
    
    call :print_success "Cleanup completed"
) else (
    call :print_error "Docker not available. Cannot clean up."
)
goto :eof

REM Main script logic
:main
set "action=%~1"
if "%action%"=="" set "action=start"

if "%action%"=="start" goto :start_action
if "%action%"=="stop" goto :stop_action
if "%action%"=="restart" goto :restart_action
if "%action%"=="status" goto :status_action
if "%action%"=="logs" goto :logs_action
if "%action%"=="clean" goto :clean_action
if "%action%"=="help" goto :help_action
if "%action%"=="--help" goto :help_action
if "%action%"=="-h" goto :help_action
goto :invalid_option

:start_action
call :print_status "Starting CI/CD Pipeline Health Dashboard..."

REM Check prerequisites
call :check_docker
if %errorlevel% neq 0 exit /b 1

call :check_docker_compose
if %errorlevel% neq 0 exit /b 1

call :check_nodejs
call :check_npm

REM Create environment file
call :create_env_file

REM Install dependencies if Node.js is available
call :install_dependencies

REM Start services
call :start_with_docker

call :print_success "🎉 CI/CD Pipeline Health Dashboard is starting up!"
echo.
call :print_status "Services will be available at:"
echo   🌐 Frontend: http://localhost:3000
echo   🔌 Backend API: http://localhost:5000
echo   🗄️  PostgreSQL: localhost:5432
echo   🔴 Redis: localhost:6379
echo   🚀 Jenkins: http://localhost:8083
echo.
call :print_status "Use '%~nx0 status' to check service status"
call :print_status "Use '%~nx0 logs' to view service logs"
call :print_status "Use '%~nx0 stop' to stop all services"
goto :end

:stop_action
call :stop_services
goto :end

:restart_action
call :stop_services
timeout /t 2 /nobreak >nul
call :main start
goto :end

:status_action
call :show_status
goto :end

:logs_action
call :show_logs
goto :end

:clean_action
call :clean_up
goto :end

:help_action
call :show_help
goto :end

:invalid_option
call :print_error "Unknown option: %action%"
call :show_help
exit /b 1

:end
echo.
pause
exit /b 0
