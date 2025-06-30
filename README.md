# HPE Datacenter Audit Tool

An internal HPE web application for streamlining datacenter auditing processes, enabling technicians to conduct audits, document issues, manage incidents, and generate comprehensive reports.

## 🏗️ Architecture

- **Frontend**: React.js with TypeScript + HPE Grommet UI Components
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL 
- **Authentication**: JWT tokens with email/password
- **Deployment**: Azure App Service + GitHub Actions CI/CD

## ✨ Features

### 🔐 Authentication System
- Email/password authentication with JWT tokens
- Secure session management
- User profile management

### 📊 Dashboard & Analytics
- Real-time metrics and KPIs
- Recent audits overview
- Active incidents monitoring
- Quick access to key functions

### 🔍 Audit Management
- **Guided Audit Creation**: Step-by-step process for setting up audits
- **Location Selection**: Choose from HPE datacenter locations worldwide
- **Data Hall Selection**: Select specific data halls within datacenters
- **Issue Reporting**: Document equipment issues with device-specific details
- **Status Tracking**: Monitor audit progress from active to completed

### 🚨 Issue & Incident Management
- **Device-Specific Reporting**: Support for PSU, PDU, Heat Exchanger, and other equipment
- **Severity Classification**: Critical, Warning, and Healthy status levels
- **Location Tracking**: Rack locations and U-height positioning
- **Incident Escalation**: Automatic incident creation for critical issues
- **Resolution Workflow**: Track issue resolution and incident closure

### 📈 Reporting & Analytics
- **CSV Report Generation**: Export comprehensive audit data
- **Flexible Filtering**: Filter by date range, datacenter, severity, and status
- **Multiple Report Types**: Audits summary, issues detailed, and incidents reports
- **Data Analysis**: Support for Excel and Google Sheets integration

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 13+
- NPM or Yarn package manager

### Backend Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Setup**
   ```bash
   # Create PostgreSQL database
   createdb hpe_audit_tool
   
   # Run migrations to create tables
   node scripts/migrate.js
   
   # Seed with sample data (optional)
   node scripts/seed.js
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=hpe_audit_tool
   DB_USER=your_username
   DB_PASSWORD=your_password
   
   # Authentication
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_REFRESH_SECRET=your-refresh-secret-here
   
   # Server Configuration
   PORT=3001
   NODE_ENV=development
   
   # CORS Configuration
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start Backend Server**
   ```bash
   node server.js
   ```
   Server will run on http://localhost:3001

### Frontend Setup

1. **Navigate to Client Directory**
   ```bash
   cd client
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development Server**
   ```bash
   npm start
   ```
   Application will open at http://localhost:3000

### Demo Users (After Seeding)
- **Mikael Sehlin**: mikael.sehlin@hpe.com / password123
- **Mohsen Alizadeh**: mohsen.alizadeh@hpe.com / password123
- **Clifford Joseph**: clifford.joseph@hpe.com / password123
- **Leena Azeez**: leena.azeez@hpe.com / password123

## 🏢 Supported Datacenter Locations

### Americas
- **United States - Dallas**: East Wing, West Wing, Central Hub
- **United States - Houston**: North Building, South Building, Storage Facility

### Europe
- **Norway - Enebakk**: Hall A, Hall B, Hall C
- **Norway - Rjukan**: Hall 1, Hall 2, Hall 3

### Americas
- **Canada - Quebec**: Island 1, Island 8, Island 9, Island 10, Island 11, Island 12, Green Nitrogen

## 🛠️ Development Status

### ✅ Completed Features
- [x] **Mini-Project 1**: Infrastructure Setup (Node.js, PostgreSQL, Security)
- [x] **Mini-Project 2**: Authentication System (JWT, User Management)
- [x] **Mini-Project 3**: Core Audit Module (CRUD, Status Management)
- [x] **Mini-Project 4**: Issue Reporting Engine (Device Types, Severity Levels)
- [x] **Mini-Project 5**: Dashboard & Reporting (Metrics, CSV Export)
- [x] **Mini-Project 6**: Incident Management (Critical Issue Handling)
- [x] **Mini-Project 7**: UI Implementation (React + HPE Grommet)

### 🔄 In Progress
- [ ] **Mini-Project 8**: Deployment Pipeline (GitHub Actions + Azure)

## 📡 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Token verification
- `POST /api/auth/refresh` - Token refresh

### Audits
- `GET /api/audits` - List audits with pagination
- `POST /api/audits` - Create new audit
- `GET /api/audits/:id` - Get audit details
- `PUT /api/audits/:id` - Update audit
- `POST /api/audits/:id/issues` - Add issue to audit
- `GET /api/audits/:id/statistics` - Get audit statistics

### Issues & Incidents
- `GET /api/issues` - List all issues
- `GET /api/incidents` - List critical incidents
- `PUT /api/incidents/:id/resolve` - Resolve incident

### Dashboard & Reports
- `GET /api/dashboard/metrics` - Dashboard metrics
- `GET /api/reports/generate` - Generate CSV reports

## 🔧 Technology Stack

### Backend Dependencies
- **Express.js** - Web framework
- **PostgreSQL** - Database with pg driver
- **JWT** - Authentication tokens
- **Bcrypt** - Password hashing
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - API protection
- **CSV Export** - Report generation

### Frontend Dependencies
- **React.js** - UI library with TypeScript
- **Grommet** - HPE design system components
- **React Router** - Client-side routing
- **Styled Components** - CSS-in-JS styling
- **Axios** - HTTP client for API calls

## 🔒 Security Features
- JWT-based authentication with refresh tokens
- Password hashing with bcrypt
- Rate limiting on API endpoints
- CORS configuration for frontend access
- Security headers with Helmet.js
- Input validation and sanitization
- SQL injection prevention with parameterized queries

## 📊 Database Schema

### Users Table
- User authentication and profile information
- Encrypted passwords with bcrypt
- Session management fields

### Audits Table
- Audit tracking with UUID primary keys
- Datacenter and data hall associations
- Technician assignments and status tracking
- Created/completed timestamps

### Issues Table
- Equipment issue documentation
- Device type categorization (PSU, PDU, Heat Exchanger)
- Severity levels (Critical, Warning, Healthy)
- JSONB device details for flexibility
- Rack location and U-height tracking

### Reports & Audit Logs
- Report generation history
- Audit trail for compliance

## 🚀 Future Enhancements
- Mobile-responsive design improvements
- Real-time notifications for critical incidents
- Advanced analytics and trending
- Integration with HPE inventory systems
- Multi-language support
- Automated incident escalation workflows

## 📝 License
Internal HPE Application - Proprietary
