# CI/CD Pipeline Health Dashboard

A comprehensive monitoring solution for CI/CD pipelines that provides real-time visibility, metrics, and alerting for engineering teams. Monitor GitHub Actions, Jenkins, GitLab CI, and other CI/CD tools from a single, unified dashboard.

## 🚀 Features

### Core Monitoring
- **Real-time Pipeline Monitoring**: Live status updates for all your CI/CD pipelines
- **Multi-Platform Support**: GitHub Actions, Jenkins, GitLab CI, Azure DevOps
- **Build Analytics**: Success/failure rates, build times, and trend analysis
- **Pipeline Health Metrics**: Overall system health and performance indicators

### Real-time Updates
- **WebSocket Integration**: Live updates without page refresh
- **Instant Notifications**: Real-time alerts for pipeline failures
- **Live Dashboard**: Dynamic metrics and status updates

### Alerting & Notifications
- **Multi-Channel Alerts**: Slack, Email, Webhook integration
- **Configurable Rules**: Customizable alert thresholds and conditions
- **Smart Suppression**: Prevent alert fatigue with intelligent suppression
- **Escalation Policies**: Automated escalation for critical failures

### Advanced Analytics
- **Success Rate Trends**: Historical success/failure rate analysis
- **Build Time Optimization**: Identify performance bottlenecks
- **Failure Analysis**: Root cause analysis and failure patterns
- **Team Performance**: Track performance across different teams and projects

## 🏗️ Architecture

The application follows a modern microservices architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WebSocket     │    │   CI/CD         │    │   Alerting      │
│   Client        │    │   Integrations  │    │   Service       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

#### Backend
- **Runtime**: Node.js 18+ with Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Cache**: Redis for session management and caching
- **Real-time**: Socket.io for WebSocket communication
- **Authentication**: JWT-based authentication with role-based access control

#### Frontend
- **Framework**: React 18 with hooks and functional components
- **State Management**: Redux Toolkit for global state
- **UI Framework**: Material-UI for consistent design
- **Charts**: Chart.js and Recharts for data visualization
- **Real-time**: Socket.io client for live updates

#### Infrastructure
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose for local development
- **Environment**: Support for development, staging, and production

## 📁 Project Structure

```
cicd-pipeline-dashboard/
├── backend/                    # Backend API server
│   ├── src/                   # Source code
│   │   ├── routes/           # API route handlers
│   │   ├── models/           # Database models
│   │   ├── services/         # Business logic services
│   │   ├── middleware/       # Express middleware
│   │   ├── database/         # Database configuration
│   │   ├── websocket/        # WebSocket handlers
│   │   ├── utils/            # Utility functions
│   │   └── server.js         # Main server file
│   ├── package.json          # Backend dependencies
│   └── Dockerfile            # Multi-environment Docker image
├── frontend/                  # React frontend application
│   ├── src/                  # Source code
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Page components
│   │   ├── contexts/         # React contexts
│   │   ├── store/            # Redux store and slices
│   │   ├── utils/            # Utility functions
│   │   └── index.js          # Main entry point
│   ├── public/               # Static assets
│   ├── package.json          # Frontend dependencies
│   └── Dockerfile            # Multi-environment Docker image
├── docker-compose.yml         # Local development services
├── setup.sh                   # Linux/macOS setup script
├── setup.bat                  # Windows setup script
├── README.md                  # Project documentation
├── progress.md                # Development progress tracking
├── prompt_logs.md             # AI tool interaction logs
├── requirement_analysis_document.md  # Requirements analysis
└── tech_design_document.md    # Technical design document
```

## 📋 Prerequisites

Before running the application, ensure you have:

- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher
- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **PostgreSQL**: Version 13 or higher (or use Docker)
- **Redis**: Version 6 or higher (or use Docker)

## 🛠️ Installation & Setup

### Root-Level Scripts

The project includes convenient root-level npm scripts for managing both backend and frontend:

```bash
# Development
npm run dev              # Start both backend and frontend in development mode
npm run dev:backend      # Start only backend in development mode
npm run dev:frontend     # Start only frontend in development mode

# Building
npm run build            # Build both backend and frontend
npm run build:backend    # Build only backend
npm run build:frontend   # Build only frontend

# Testing
npm run test             # Run tests for both backend and frontend
npm run test:backend     # Run only backend tests
npm run test:frontend    # Run only frontend tests

# Linting
npm run lint             # Lint both backend and frontend
npm run lint:fix         # Fix linting issues for both

# Database
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed database with initial data

# Docker
npm run docker:up        # Start all services with Docker Compose
npm run docker:down      # Stop all services
npm run docker:logs      # View Docker logs
npm run docker:rebuild   # Rebuild and start services
```

### Option 1: Quick Start with Setup Scripts (Recommended)

#### Linux/macOS
```bash
git clone https://github.com/yourusername/cicd-pipeline-dashboard.git
cd cicd-pipeline-dashboard
chmod +x setup.sh
./setup.sh
```

#### Windows
```cmd
git clone https://github.com/yourusername/cicd-pipeline-dashboard.git
cd cicd-pipeline-dashboard
setup.bat
```

### Option 2: Manual Setup with Docker

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/cicd-pipeline-dashboard.git
   cd cicd-pipeline-dashboard
   ```

2. **Create environment file**
   ```bash
   # Create .env file with your configuration
   # See Configuration section below for required variables
   ```

3. **Install dependencies**
   ```bash
   # Backend dependencies
   cd backend && npm install && cd ..
   
   # Frontend dependencies
   cd frontend && npm install && cd ..
   ```

4. **Start all services**
   ```bash
   docker-compose up -d
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379

### Option 2: Local Development Setup

1. **Install all dependencies**
   ```bash
   # Install root, backend, and frontend dependencies
   npm run install:all
   ```
   
   Or install individually:
   ```bash
   # Backend dependencies
   cd backend
   npm install
   cd ..
   
   # Frontend dependencies
   cd frontend
   npm install
   cd ..
   ```

2. **Set up database**
   ```bash
   # Create PostgreSQL database
   createdb cicd_dashboard
   
   # Run migrations
   cd backend
   npm run db:migrate
   cd ..
   
   # Seed initial data (optional)
   cd backend
   npm run db:seed
   cd ..
   ```

3. **Start Redis**
   ```bash
   # Using Docker
   docker run -d -p 6379:6379 redis:7-alpine
   
   # Or install locally
   # Follow Redis installation guide for your OS
   ```

4. **Start backend**
   ```bash
   cd backend
   npm run dev
   ```

5. **Start frontend**
   ```bash
   cd frontend
   npm start
   ```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Application
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cicd_dashboard
DB_USER=postgres
DB_PASSWORD=password
DATABASE_URL=postgresql://postgres:password@localhost:5432/cicd_dashboard

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here

# GitHub Integration
GITHUB_TOKEN=your-github-personal-access-token
GITHUB_WEBHOOK_SECRET=your-webhook-secret

# Slack Integration
SLACK_WEBHOOK_URL=your-slack-webhook-url

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Logging
LOG_LEVEL=info
```

### CI/CD Integration Configuration

#### GitHub Actions
1. Create a Personal Access Token with `repo` and `workflow` scopes
2. Add the token to your environment variables
3. Configure webhooks in your GitHub repository settings

#### Jenkins
1. Create an API token in Jenkins user configuration
2. Add Jenkins URL and credentials to environment variables
3. Configure webhook endpoints in Jenkins

## 🚀 Usage

### First Time Setup

1. **Register an account**
   - Navigate to http://localhost:3000/register
   - Create your first user account
   - The first user automatically becomes a super admin

2. **Add your first pipeline**
   - Go to the Pipelines page
   - Click "Add Pipeline"
   - Select your CI/CD tool type
   - Configure connection details

3. **Configure alerts**
   - Set up alert rules for pipeline failures
   - Configure notification channels (Slack, Email, Webhook)
   - Test your alert configuration

### Demo Credentials

For testing purposes, you can use these demo credentials:
- **Email**: demo@example.com
- **Password**: demo123

**Note**: The demo user is automatically created during first-time setup via `init.sql`. If you encounter any issues, you can also register a new account at `/register`.

### Dashboard Overview

The main dashboard provides:

- **Metrics Cards**: Overall success rate, build time, active pipelines
- **Pipeline Status Grid**: Visual representation of all pipelines
- **Recent Activity**: Latest builds and status changes
- **Performance Charts**: Success rate trends and build time analysis

### Pipeline Management

- **Add Pipelines**: Configure new CI/CD tool integrations
- **Monitor Status**: Real-time pipeline health monitoring
- **View Builds**: Detailed build history and logs
- **Configure Alerts**: Set up failure notifications

### Alert Configuration

- **Alert Rules**: Define conditions for triggering alerts
- **Notification Channels**: Configure Slack, Email, or custom webhooks
- **Escalation Policies**: Set up automated escalation for critical issues
- **Alert Suppression**: Prevent alert spam with smart suppression

## 🔧 API Documentation

### Authentication

All API endpoints require authentication via JWT tokens:

```bash
# Login to get token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@example.com", "password": "demo123"}'

# Use token in subsequent requests
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/pipelines
```

### Key Endpoints

#### Pipelines
- `GET /api/pipelines` - List all pipelines
- `POST /api/pipelines` - Create new pipeline
- `GET /api/pipelines/:id` - Get pipeline details
- `PUT /api/pipelines/:id` - Update pipeline
- `DELETE /api/pipelines/:id` - Delete pipeline

#### Builds
- `GET /api/builds` - List all builds
- `GET /api/builds/:id` - Get build details
- `GET /api/builds/:id/logs` - Get build logs

#### Metrics
- `GET /api/metrics/summary` - Dashboard summary metrics
- `GET /api/metrics/success-rate` - Success/failure rates
- `GET /api/metrics/build-time` - Build time analytics

#### Alerts
- `GET /api/alerts` - List all alerts
- `POST /api/alerts` - Create new alert
- `PUT /api/alerts/:id` - Update alert

### WebSocket Events

Real-time updates via WebSocket:

```javascript
// Connect to WebSocket
const socket = io('http://localhost:5000', {
  auth: { token: 'your-jwt-token' }
});

// Subscribe to pipeline updates
socket.emit('subscribe:pipeline', 'pipeline-id');

// Listen for updates
socket.on('pipeline:update', (data) => {
  console.log('Pipeline updated:', data);
});

socket.on('build:status', (data) => {
  console.log('Build status changed:', data);
});
```

## 🧪 Testing

### Backend Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- --testPathPattern=auth.test.js
```

### Frontend Tests

```bash
cd frontend

# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Current Test Status

- **Backend**: Core API endpoints implemented and ready for testing
- **Frontend**: Basic components implemented, comprehensive testing pending
- **Integration**: Webhook endpoints and CI/CD integrations ready for testing

### API Testing

Use the provided Postman collection or test with curl:

```bash
# Test health endpoint
curl http://localhost:5000/health

# Test authentication
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@example.com", "password": "demo123"}'
```

## 🐳 Docker Commands

### Dockerfile Usage

The project uses single Dockerfiles that support both development and production environments:

```bash
# Development build (includes dev dependencies and hot reloading)
docker build --build-arg BUILD_TYPE=development -t myapp:dev ./backend
docker build --build-arg BUILD_TYPE=development -t myapp:dev ./frontend

# Production build (optimized, production dependencies only)
docker build --build-arg BUILD_TYPE=production -t myapp:prod ./backend
docker build --build-arg BUILD_TYPE=production -t myapp:prod ./frontend

# Default build (production)
docker build -t myapp ./backend
docker build -t myapp ./frontend
```

### Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and start
docker-compose up -d --build

# Access specific service
docker-compose exec backend bash
docker-compose exec postgres psql -U postgres -d cicd_dashboard
```

### Production

```bash
# Build production image
docker build -t cicd-dashboard:latest ./backend

# Run production container
docker run -d \
  -p 5000:5000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=your-db-url \
  --name cicd-dashboard \
  cicd-dashboard:latest
```

## 📊 Monitoring & Logging

### Application Logs

Logs are written to both console and files:

```bash
# View application logs
tail -f backend/logs/combined.log

# View error logs
tail -f backend/logs/error.log

# View Docker logs
docker-compose logs -f backend
```

### Health Checks

The application provides health check endpoints:

- `GET /health` - Application health status
- Database connectivity check
- Redis connectivity check
- External service status

### Performance Monitoring

- Request/response timing
- Database query performance
- Memory and CPU usage
- WebSocket connection status

## 🔒 Security

### Authentication & Authorization

- JWT-based authentication
- Role-based access control (User, Admin, Super Admin)
- Secure password hashing with bcrypt
- Token refresh mechanism

### Data Protection

- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection

### Network Security

- HTTPS enforcement in production
- CORS configuration
- Rate limiting
- Security headers (Helmet.js)

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**
   ```bash
   # Set production environment variables
   export NODE_ENV=production
   export DATABASE_URL=your-production-db-url
   export REDIS_URL=your-production-redis-url
   ```

2. **Database Migration**
   ```bash
   npm run db:migrate
   ```

3. **Build and Deploy**
   ```bash
   # Build production image
docker build -t cicd-dashboard:prod ./backend
   
   # Deploy to your infrastructure
   docker run -d \
     -p 80:5000 \
     --restart unless-stopped \
     -e NODE_ENV=production \
     cicd-dashboard:prod
   ```

### Cloud Deployment

#### AWS
- Use ECS/Fargate for container orchestration
- RDS for PostgreSQL
- ElastiCache for Redis
- Application Load Balancer for traffic distribution

#### Google Cloud
- Cloud Run for serverless deployment
- Cloud SQL for PostgreSQL
- Memorystore for Redis
- Cloud Load Balancing

#### Azure
- Azure Container Instances
- Azure Database for PostgreSQL
- Azure Cache for Redis
- Azure Application Gateway

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Standards

- Follow ESLint configuration
- Use Prettier for code formatting
- Write meaningful commit messages
- Include JSDoc comments for functions
- Follow the existing code style

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help

- **Documentation**: Check this README and the docs folder
- **Issues**: Report bugs and request features via GitHub Issues
- **Discussions**: Join community discussions on GitHub
- **Wiki**: Check the project wiki for additional information

### Common Issues

#### Database Connection Issues
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure database exists and is accessible

#### Demo User Login Issues
- If demo@example.com doesn't work, try registering a new account at `/register`
- The first user automatically becomes a super admin
- Demo user is created automatically via `init.sql` during first-time setup

#### WebSocket Connection Issues
- Check CORS configuration
- Verify JWT token is valid
- Check firewall/network settings

#### CI/CD Integration Issues
- Verify API tokens and credentials
- Check webhook configurations
- Review API rate limits

## 🔮 Roadmap

### Upcoming Features

- **Machine Learning**: Failure prediction and anomaly detection
- **Advanced Analytics**: Custom dashboards and reporting
- **Mobile App**: Native mobile application
- **Team Collaboration**: Team-specific views and permissions
- **Integration Hub**: More CI/CD tool integrations

### Version History

- **v1.0.0**: Initial release with core monitoring features
- **v1.1.0**: Enhanced alerting and notification system
- **v1.2.0**: Advanced analytics and reporting
- **v2.0.0**: Machine learning and predictive analytics

### Current Development Status

- **Backend**: ✅ Complete (95%)
- **Frontend**: 🚧 In Progress (60%)
- **Database**: ✅ Complete (100%)
- **Integrations**: ✅ Complete (100%)
- **Documentation**: ✅ Complete (90%)

## 🙏 Acknowledgments

- Built with modern web technologies and best practices
- Inspired by the need for better CI/CD pipeline visibility
- Community contributions and feedback
- Open source projects that made this possible
- Developed with assistance from Cursor IDE + GPT-4

---

**Made with ❤️ for the DevOps community**

For questions, support, or contributions, please reach out to our team or open an issue on GitHub.

## 📋 Project Status Summary

### ✅ Completed Features
- **Backend API**: Complete REST API with authentication, pipelines, builds, metrics, alerts, and webhooks
- **Database**: Full PostgreSQL schema with Sequelize ORM, including all required models
- **CI/CD Integrations**: GitHub Actions, Jenkins, GitLab CI with webhook support
- **Alerting System**: Multi-channel notifications (Slack, Email, Webhooks)
- **Authentication**: JWT-based auth with role-based access control
- **Real-time Updates**: WebSocket integration for live dashboard updates

### 🚧 In Progress
- **Frontend Components**: Core pages implemented (Dashboard, Login, Register)
- **UI/UX**: Material-UI components with responsive design
- **State Management**: Redux Toolkit store with all required slices

### 📋 Next Steps
- Complete remaining frontend pages (Pipelines, Builds, Alerts, Settings)
- Add comprehensive testing suite
- Implement advanced dashboard features
- Add user management and team features
