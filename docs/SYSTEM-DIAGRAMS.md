# GreenSky Solar Management System - Technical Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [System Architecture Flowchart](#system-architecture-flowchart)
3. [Level 0 Data Flow Diagram](#level-0-data-flow-diagram)
4. [Detailed Process Flows](#detailed-process-flows)
5. [Entity Relationship Overview](#entity-relationship-overview)

---

## System Overview

**System Name:** GreenSky Solar Management System  
**Purpose:** End-to-end solar installation management platform  
**User Roles:** Admin, Technician, Client  
**Core Modules:** Authentication, Bookings, Projects, Inventory, Payments, Calendar, Reports, After-Sales

---

## System Architecture Flowchart

```mermaid
graph TB
    subgraph Presentation["Presentation Layer"]
        WebUI[Web Application - Next.js]
        AdminDash[Admin Dashboard]
        TechDash[Technician Portal]
        ClientPortal[Client Portal]
    end

    subgraph Application["Application Layer"]
        Auth[Authentication & Authorization]
        API[REST API Routes]
        Middleware[Middleware & Guards]
        Validation[Input Validation]
    end

    subgraph Business["Business Logic Layer"]
        BookingService[Booking Service]
        ProjectService[Project Service]
        InventoryService[Inventory Service]
        PaymentService[Payment Service]
        CalendarService[Calendar Service]
        NotificationService[Notification Service]
        ReportService[Report Service]
        DocumentService[Document Service]
    end

    subgraph Data["Data Access Layer"]
        UserRepo[User Repository]
        ProjectRepo[Project Repository]
        BookingRepo[Booking Repository]
        InventoryRepo[Inventory Repository]
        PaymentRepo[Payment Repository]
        NotificationRepo[Notification Repository]
    end

    subgraph Database["Database Layer"]
        PostgreSQL[(PostgreSQL Database)]
        Tables[Tables: users, projects, bookings,<br/>inventory, payments, notifications,<br/>calendar_events, documents, etc.]
    end

    subgraph External["External Systems"]
        Email[Email Service]
        Storage[File Storage]
        Maps[Geolocation API]
    end

    WebUI --> AdminDash
    WebUI --> TechDash
    WebUI --> ClientPortal

    AdminDash --> API
    TechDash --> API
    ClientPortal --> API

    API --> Auth
    API --> Middleware
    API --> Validation

    Middleware --> BookingService
    Middleware --> ProjectService
    Middleware --> InventoryService
    Middleware --> PaymentService
    Middleware --> CalendarService
    Middleware --> NotificationService
    Middleware --> ReportService
    Middleware --> DocumentService

    BookingService --> BookingRepo
    ProjectService --> ProjectRepo
    InventoryService --> InventoryRepo
    PaymentService --> PaymentRepo
    NotificationService --> NotificationRepo

    UserRepo --> PostgreSQL
    ProjectRepo --> PostgreSQL
    BookingRepo --> PostgreSQL
    InventoryRepo --> PostgreSQL
    PaymentRepo --> PostgreSQL
    NotificationRepo --> PostgreSQL

    PostgreSQL --> Tables

    NotificationService -.-> Email
    DocumentService -.-> Storage
    BookingService -.-> Maps

    style WebUI fill:#3498db,stroke:#2980b9,color:#fff
    style PostgreSQL fill:#27ae60,stroke:#229954,color:#fff
    style Auth fill:#e74c3c,stroke:#c0392b,color:#fff
```

---

## Level 0 Data Flow Diagram

```mermaid
graph LR
    %% External Entities
    Client([Client User])
    Admin([Admin User])
    Tech([Technician])
    EmailSys[Email System]

    %% Main System Process
    System((GreenSky Solar<br/>Management System))

    %% Data Stores
    UserDB[(User Database)]
    ProjectDB[(Project Database)]
    BookingDB[(Booking Database)]
    InventoryDB[(Inventory Database)]
    PaymentDB[(Payment Database)]
    NotificationDB[(Notification Database)]
    DocumentDB[(Document Database)]

    %% Client Flows
    Client -->|Login Credentials| System
    Client -->|Booking Request| System
    Client -->|Address & Site Info| System
    Client -->|Payment Info| System
    System -->|Quotation| Client
    System -->|Invoice| Client
    System -->|Booking Confirmation| Client
    System -->|Project Updates| Client
    System -->|Notifications| Client

    %% Admin Flows
    Admin -->|Login Credentials| System
    Admin -->|Project Data| System
    Admin -->|Inventory Updates| System
    Admin -->|Technician Assignment| System
    Admin -->|Invoice Generation| System
    System -->|Reports| Admin
    System -->|Booking Requests| Admin
    System -->|Inventory Status| Admin
    System -->|Payment Records| Admin

    %% Technician Flows
    Tech -->|Login Credentials| System
    Tech -->|Task Updates| System
    Tech -->|Report Submission| System
    System -->|Assigned Projects| Tech
    System -->|Task List| Tech
    System -->|Schedule| Tech

    %% System to Data Stores
    System <-->|User Data| UserDB
    System <-->|Project Data| ProjectDB
    System <-->|Booking Data| BookingDB
    System <-->|Inventory Data| InventoryDB
    System <-->|Payment Data| PaymentDB
    System <-->|Notification Data| NotificationDB
    System <-->|Document Data| DocumentDB

    %% System to External
    System -.->|Email Notifications| EmailSys
    EmailSys -.->|Alerts & Updates| Client
    EmailSys -.->|Alerts & Updates| Admin
    EmailSys -.->|Alerts & Updates| Tech

    style Client fill:#3498db,stroke:#2980b9,color:#fff
    style Admin fill:#f39c12,stroke:#d68910,color:#fff
    style Tech fill:#16a085,stroke:#138d75,color:#fff
    style System fill:#e74c3c,stroke:#c0392b,color:#fff
    style UserDB fill:#95a5a6,stroke:#7f8c8d,color:#fff
    style ProjectDB fill:#95a5a6,stroke:#7f8c8d,color:#fff
    style BookingDB fill:#95a5a6,stroke:#7f8c8d,color:#fff
    style InventoryDB fill:#95a5a6,stroke:#7f8c8d,color:#fff
    style PaymentDB fill:#95a5a6,stroke:#7f8c8d,color:#fff
```

---

## Detailed Process Flows

### 1. Complete Booking to Project Completion Flow

```mermaid
flowchart LR
    subgraph Client["CLIENT LANE"]
        C0([START])
        C1[/Create Address<br/>& Site Profile<br/>appliances, Meralco bill/]
        C2[/Submit Booking<br/>select date, time, service/]
        C3[Reselect<br/>Date/Time]
        C4[/Review<br/>Quotation/]
        C5{Agree to<br/>Quotation?}
        C6[/Pay 50%<br/>Downpayment/]
        C7[/Pay Final<br/>50% Payment/]
        C8([END])
    end

    subgraph Admin["ADMIN LANE"]
        A1[Review Booking<br/>/bookings page]
        D1{Slot<br/>Available?}
        A2[Set Booking<br/>= Confirmed]
        A3[Create Project<br/>/projects page]
        A12[/Prepare &<br/>Send Quotation/]
        A13[Record 50%<br/>Downpayment]
        A16[Schedule Solar<br/>Installation<br/>/calendar]
        A4[Assign<br/>Technician]
        A6[Check<br/>Inventory]
        D3{Stock<br/>Sufficient?}
        A8[Create Purchase<br/>Request]
        A14[Generate<br/>Final Invoice]
        A15[/Issue Final<br/>50% Payment/]
        A11[/Send<br/>Notification/]
    end

    subgraph Technician["TECHNICIAN LANE"]
        D2{Technician<br/>Available?}
        T1[Receive<br/>Project]
        T2[Execute<br/>Installation]
        T3[Submit<br/>Completion Report]
        D4{Project<br/>Complete?}
        T4[Rework/Fix<br/>Issues]
    end

    %% Flow connections
    C0 --> C1
    C1 --> C2
    C2 --> A1
    A1 --> D1
    D1 -->|No| C3
    C3 --> C2
    D1 -->|Yes| A2
    A2 --> A3
    A3 --> A12
    A12 --> C4
    C4 --> C5
    C5 -->|No| A12
    C5 -->|Yes| C6
    C6 --> A13
    A13 --> A16
    A16 --> A4
    A4 --> D2
    D2 -->|No| A4
    D2 -->|Yes| A6
    A6 --> D3
    D3 -->|No| A8
    A8 --> A6
    D3 -->|Yes| T1
    T1 --> T2
    T2 --> T3
    T3 --> D4
    D4 -->|No| T4
    T4 --> T2
    D4 -->|Yes| A14
    A14 --> A15
    A15 --> C7
    C7 --> A11
    A11 --> C8

    style C0 fill:#27ae60,stroke:#229954,color:#fff
    style C8 fill:#27ae60,stroke:#229954,color:#fff
    style C1 fill:#3498db,stroke:#2980b9,color:#fff
    style C2 fill:#3498db,stroke:#2980b9,color:#fff
    style C4 fill:#3498db,stroke:#2980b9,color:#fff
    style C6 fill:#3498db,stroke:#2980b9,color:#fff
    style C7 fill:#3498db,stroke:#2980b9,color:#fff
    style C3 fill:#e74c3c,stroke:#c0392b,color:#fff
    style C5 fill:#e67e22,stroke:#d35400,color:#fff
    style D1 fill:#e67e22,stroke:#d35400,color:#fff
    style D2 fill:#16a085,stroke:#138d75,color:#fff
    style D3 fill:#e67e22,stroke:#d35400,color:#fff
    style D4 fill:#16a085,stroke:#138d75,color:#fff
    style A12 fill:#f39c12,stroke:#d68910,color:#fff
    style A15 fill:#f39c12,stroke:#d68910,color:#fff
    style A11 fill:#f39c12,stroke:#d68910,color:#fff
```

### 2. Inventory Management Process Flow

```mermaid
flowchart TB
    Start([Inventory Process Start])
    
    %% Stock Management
    A1[Add New Item<br/>to Inventory]
    A2[Set Min Stock<br/>Threshold]
    
    %% Allocation
    B1[Project Created]
    B2[Admin Allocates<br/>Inventory to Project]
    B3{Stock<br/>Available?}
    B4[Create Deduction<br/>Movement Record]
    B5[Update Inventory<br/>Quantity]
    B6[Create Purchase<br/>Request]
    
    %% During Project
    C1{Project<br/>Status?}
    C2[Project In Progress]
    C3[Project Cancelled]
    C4[Project Completed]
    
    %% Returns
    D1[Return Inventory<br/>to Stock]
    D2[Create Return<br/>Movement Record]
    D3[Update Inventory<br/>Quantity +]
    
    %% Monitoring
    E1{Stock Level<br/>< Min?}
    E2[Send Low Stock<br/>Alert to Admin]
    E3[Update Status<br/>to Low Stock]
    
    End([Inventory Process End])
    
    Start --> A1
    A1 --> A2
    A2 --> B1
    B1 --> B2
    B2 --> B3
    B3 -->|No| B6
    B6 --> B2
    B3 -->|Yes| B4
    B4 --> B5
    B5 --> C1
    C1 --> C2
    C1 --> C3
    C1 --> C4
    C3 --> D1
    D1 --> D2
    D2 --> D3
    D3 --> E1
    C2 --> End
    C4 --> End
    E1 -->|Yes| E2
    E1 -->|No| End
    E2 --> E3
    E3 --> End
    
    style Start fill:#27ae60,stroke:#229954,color:#fff
    style End fill:#27ae60,stroke:#229954,color:#fff
    style B3 fill:#e67e22,stroke:#d35400,color:#fff
    style C1 fill:#e67e22,stroke:#d35400,color:#fff
    style E1 fill:#e67e22,stroke:#d35400,color:#fff
    style B6 fill:#e74c3c,stroke:#c0392b,color:#fff
    style E2 fill:#e74c3c,stroke:#c0392b,color:#fff
```

### 3. Payment & Invoice Process Flow

```mermaid
flowchart TB
    Start([Payment Process Start])
    
    %% Invoice Generation
    A1[Admin Creates<br/>Invoice]
    A2[Generate Invoice<br/>Number INV-XXXX]
    A3[Set Payment<br/>Details & Due Date]
    A4[Create Payment<br/>Record in DB]
    A5[Create Document<br/>Entry for Client]
    A6[Send Invoice<br/>Notification to Client]
    
    %% Client Payment
    B1[Client Reviews<br/>Invoice]
    B2{Payment<br/>Method?}
    B3[GCash Payment]
    B4[Bank Transfer]
    B5[Credit Card]
    B6[Cash Payment]
    
    %% Payment Processing
    C1[Client Submits<br/>Payment]
    C2[Admin Verifies<br/>Payment]
    C3{Payment<br/>Verified?}
    C4[Update Payment<br/>Status = Paid]
    C5[Request Additional<br/>Information]
    
    %% Notifications
    D1[Send Payment<br/>Confirmation to Client]
    D2[Update Project<br/>Payment Status]
    D3{Payment<br/>Type?}
    D4[Trigger Installation<br/>Scheduling 50%]
    D5[Mark Project<br/>Fully Paid Final 50%]
    
    %% Overdue
    E1{Payment<br/>Overdue?}
    E2[Update Status<br/>= Overdue]
    E3[Send Overdue<br/>Reminder]
    
    End([Payment Process End])
    
    Start --> A1
    A1 --> A2
    A2 --> A3
    A3 --> A4
    A4 --> A5
    A5 --> A6
    A6 --> B1
    B1 --> B2
    B2 --> B3
    B2 --> B4
    B2 --> B5
    B2 --> B6
    B3 --> C1
    B4 --> C1
    B5 --> C1
    B6 --> C1
    C1 --> C2
    C2 --> C3
    C3 -->|No| C5
    C5 --> C1
    C3 -->|Yes| C4
    C4 --> D1
    D1 --> D2
    D2 --> D3
    D3 -->|Downpayment| D4
    D3 -->|Final Payment| D5
    D4 --> End
    D5 --> End
    
    A6 --> E1
    E1 -->|Yes| E2
    E1 -->|No| End
    E2 --> E3
    E3 --> End
    
    style Start fill:#27ae60,stroke:#229954,color:#fff
    style End fill:#27ae60,stroke:#229954,color:#fff
    style B2 fill:#e67e22,stroke:#d35400,color:#fff
    style C3 fill:#e67e22,stroke:#d35400,color:#fff
    style D3 fill:#e67e22,stroke:#d35400,color:#fff
    style E1 fill:#e67e22,stroke:#d35400,color:#fff
    style C5 fill:#e74c3c,stroke:#c0392b,color:#fff
```

### 4. Authentication & Authorization Flow

```mermaid
flowchart TB
    Start([User Access System])
    
    %% Login
    A1[User Enters<br/>Email & Password]
    A2[System Validates<br/>Credentials]
    A3{Valid<br/>Credentials?}
    A4[Check User Role]
    A5[Invalid Login<br/>Error Message]
    A6[Record Login<br/>Activity]
    
    %% Role-Based Routing
    B1{User<br/>Role?}
    B2[Route to<br/>Admin Dashboard]
    B3[Route to<br/>Technician Portal]
    B4[Route to<br/>Client Portal]
    
    %% Session Management
    C1[Create Session<br/>Token]
    C2[Set Session<br/>Cookie]
    
    %% Authorization
    D1[User Requests<br/>Resource]
    D2[Middleware Checks<br/>Authentication]
    D3{Valid<br/>Session?}
    D4[Check Authorization<br/>requireAdmin/Tech/Client]
    D5{Has<br/>Permission?}
    D6[Grant Access]
    D7[Return 401<br/>Unauthorized]
    D8[Return 403<br/>Forbidden]
    
    %% Password Reset
    E1[Forgot Password<br/>Request]
    E2[Generate Reset<br/>Token]
    E3[Send Email with<br/>Reset Link]
    E4[User Clicks Link<br/>& Sets New Password]
    E5[Update Password<br/>in Database]
    
    End([Access Granted])
    
    Start --> A1
    A1 --> A2
    A2 --> A3
    A3 -->|No| A5
    A5 --> Start
    A3 -->|Yes| A4
    A4 --> A6
    A6 --> B1
    B1 -->|Admin| B2
    B1 -->|Technician| B3
    B1 -->|Client| B4
    B2 --> C1
    B3 --> C1
    B4 --> C1
    C1 --> C2
    C2 --> End
    
    End --> D1
    D1 --> D2
    D2 --> D3
    D3 -->|No| D7
    D3 -->|Yes| D4
    D4 --> D5
    D5 -->|No| D8
    D5 -->|Yes| D6
    
    A5 -.->|Forgot Password| E1
    E1 --> E2
    E2 --> E3
    E3 --> E4
    E4 --> E5
    E5 --> Start
    
    style Start fill:#27ae60,stroke:#229954,color:#fff
    style End fill:#27ae60,stroke:#229954,color:#fff
    style A3 fill:#e67e22,stroke:#d35400,color:#fff
    style B1 fill:#e67e22,stroke:#d35400,color:#fff
    style D3 fill:#e67e22,stroke:#d35400,color:#fff
    style D5 fill:#e67e22,stroke:#d35400,color:#fff
    style A5 fill:#e74c3c,stroke:#c0392b,color:#fff
    style D7 fill:#e74c3c,stroke:#c0392b,color:#fff
    style D8 fill:#e74c3c,stroke:#c0392b,color:#fff
```

### 5. Notification System Flow

```mermaid
flowchart LR
    subgraph Triggers["Event Triggers"]
        T1[Booking Submitted]
        T2[Booking Confirmed]
        T3[Task Assigned]
        T4[Payment Received]
        T5[Report Submitted]
        T6[Document Available]
        T7[Project Status Change]
    end
    
    subgraph Processing["Notification Processing"]
        P1[Event Detected]
        P2[Determine<br/>Notification Type]
        P3[Identify Target<br/>Users by Role]
        P4[Create Notification<br/>Record in DB]
        P5[Format Notification<br/>Message]
    end
    
    subgraph Delivery["Delivery Channels"]
        D1[In-App Notification<br/>Bell Icon]
        D2[Email Notification<br/>External Service]
        D3[Update Unread<br/>Count]
    end
    
    subgraph User["User Actions"]
        U1[User Views<br/>Notifications]
        U2[Click Notification]
        U3[Navigate to<br/>Related Resource]
        U4[Mark as Read]
        U5[Clear All<br/>Notifications]
    end
    
    T1 --> P1
    T2 --> P1
    T3 --> P1
    T4 --> P1
    T5 --> P1
    T6 --> P1
    T7 --> P1
    
    P1 --> P2
    P2 --> P3
    P3 --> P4
    P4 --> P5
    
    P5 --> D1
    P5 --> D2
    P5 --> D3
    
    D1 --> U1
    U1 --> U2
    U2 --> U3
    U3 --> U4
    U1 --> U5
    
    style P1 fill:#3498db,stroke:#2980b9,color:#fff
    style P4 fill:#f39c12,stroke:#d68910,color:#fff
    style D1 fill:#16a085,stroke:#138d75,color:#fff
    style D2 fill:#16a085,stroke:#138d75,color:#fff
```

---

## Entity Relationship Overview

```mermaid
erDiagram
    USERS ||--o{ BOOKINGS : creates
    USERS ||--o{ PROJECTS : owns
    USERS ||--o{ PAYMENTS : makes
    USERS ||--o{ SAVED_ADDRESSES : has
    USERS ||--o{ DOCUMENTS : owns
    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o{ TECHNICIANS : "is linked to"
    
    TECHNICIANS ||--o{ PROJECTS : "leads"
    TECHNICIANS ||--o{ PROJECT_TECHNICIANS : assigned
    TECHNICIANS ||--o{ TASKS : "assigned to"
    
    PROJECTS ||--o{ TASKS : contains
    PROJECTS ||--o{ PROJECT_TECHNICIANS : has
    PROJECTS ||--o{ PROJECT_INVENTORY : uses
    PROJECTS ||--o{ CALENDAR_EVENTS : schedules
    PROJECTS ||--o{ REPORTS : generates
    PROJECTS ||--o| BOOKINGS : "created from"
    
    BOOKINGS ||--o| SAVED_ADDRESSES : "uses"
    
    SAVED_ADDRESSES ||--o{ APPLIANCES : contains
    
    INVENTORY_ITEMS ||--o{ PROJECT_INVENTORY : allocated
    INVENTORY_ITEMS ||--o{ INVENTORY_MOVEMENTS : tracked
    
    PROJECT_INVENTORY ||--o{ INVENTORY_MOVEMENTS : generates
    
    USERS {
        string id PK
        string name
        string email UK
        string password_hash
        enum role
        string status
        timestamp last_login
    }
    
    TECHNICIANS {
        string id PK
        string user_id FK
        string name
        string email UK
        string phone
        string specialization
        decimal rating
        int projects_completed
        string status
    }
    
    PROJECTS {
        string id PK
        string name
        string client
        string location
        enum status
        enum priority
        date start_date
        date end_date
        decimal budget
        int progress
        string project_lead FK
        string user_id FK
        string booking_id FK
    }
    
    BOOKINGS {
        string id PK
        string reference_no UK
        enum service_type
        date date
        string time
        enum status
        string address
        string user_id FK
        string address_id FK
    }
    
    INVENTORY_ITEMS {
        string id PK
        string name
        string sku UK
        enum category
        int quantity
        int min_stock
        decimal unit_price
        enum status
    }
    
    PAYMENTS {
        string id PK
        string reference_no UK
        decimal amount
        enum status
        enum method
        date date
        date due_date
        string user_id FK
    }
    
    SAVED_ADDRESSES {
        string id PK
        string label
        string full_address
        string city
        string province
        double lat
        double lng
        boolean is_default
        string user_id FK
    }
    
    NOTIFICATIONS {
        string id PK
        string user_id FK
        enum type
        string title
        string message
        string link
        timestamp read_at
        timestamp created_at
    }
```

---

## API Endpoints Reference

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### Bookings
- `GET /api/bookings` - List all bookings (Admin)
- `GET /api/client/bookings` - List client bookings
- `POST /api/client/bookings` - Create new booking
- `PATCH /api/bookings/[id]` - Update booking status
- `DELETE /api/bookings/[id]` - Cancel booking

### Projects
- `GET /api/projects` - List projects (Admin/Technician)
- `GET /api/client/projects` - List client projects
- `POST /api/projects` - Create project (Admin)
- `PATCH /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project
- `GET /api/projects/[id]` - Get project details

### Inventory
- `GET /api/inventory` - List inventory items
- `POST /api/inventory` - Add inventory item
- `PATCH /api/inventory/[id]` - Update inventory
- `POST /api/projects/[id]/inventory` - Allocate inventory to project
- `DELETE /api/projects/[id]/inventory/[itemId]` - Remove allocation
- `GET /api/inventory/movements` - List inventory movements

### Payments & Invoices
- `GET /api/invoice` - List invoices (Admin)
- `POST /api/invoice` - Create invoice (Admin)
- `GET /api/client/payments` - List client payments
- `PATCH /api/client/payments/[id]` - Update payment status

### Calendar
- `GET /api/calendar/events` - List calendar events
- `POST /api/calendar/events` - Create calendar event
- `PATCH /api/calendar/events/[id]` - Update event
- `DELETE /api/calendar/events/[id]` - Delete event

### Notifications
- `GET /api/notifications` - List notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PATCH /api/notifications/[id]/read` - Mark notification as read
- `PATCH /api/notifications/mark-all-read` - Mark all as read
- `DELETE /api/notifications/clear-all` - Clear all notifications

### Users & Technicians
- `GET /api/users` - List users (Admin)
- `POST /api/users` - Create user (Admin)
- `PATCH /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Delete user
- `GET /api/technicians` - List technicians
- `POST /api/technicians` - Create technician

### Reports
- `GET /api/reports` - List reports (Admin)
- `POST /api/reports` - Submit report
- `PATCH /api/reports/[id]` - Update report status
- `DELETE /api/reports/[id]` - Delete report

### After-Sales
- `GET /api/after-sales/tickets` - List support tickets
- `POST /api/after-sales/tickets` - Create support ticket
- `PATCH /api/after-sales/tickets/[id]` - Update ticket status

### Documents
- `GET /api/client/documents` - List client documents
- `GET /api/client/warranty` - List warranty information

### Profile
- `GET /api/profile` - Get user profile
- `PATCH /api/profile` - Update profile
- `GET /api/profile/login-activity` - Get login history

---

## Technology Stack

**Frontend:**
- Next.js 14+ (App Router)
- React 18+
- TypeScript
- Tailwind CSS
- Lucide Icons

**Backend:**
- Next.js API Routes
- Node.js Runtime
- PostgreSQL Database
- Server-Side Authentication

**Key Libraries:**
- Iron-session (Session Management)
- Bcrypt (Password Hashing)
- Date-fns (Date Utilities)
- Zod (Validation)

**External Services:**
- Email Service (Password Reset, Notifications)
- Geolocation API (Address Mapping)
- File Storage (Document Management)

---

## Security Features

1. **Authentication**
   - Password hashing with bcrypt
   - Session-based authentication
   - Secure HTTP-only cookies
   - Password reset with time-limited tokens

2. **Authorization**
   - Role-based access control (Admin, Technician, Client)
   - Route guards (requireAdmin, requireClient, requireAdminOrTechnician)
   - Resource-level permissions

3. **Data Protection**
   - Input validation with Zod schemas
   - SQL injection prevention (parameterized queries)
   - XSS protection
   - CSRF protection

4. **Audit & Monitoring**
   - Login activity tracking
   - Audit log for critical operations
   - Idempotency keys for payment operations

---

## Database Schema Summary

**Total Tables:** 19

**Core Tables:**
- `users` - User accounts (admin, technician, client)
- `technicians` - Technician profiles
- `clients` - Client information
- `projects` - Solar installation projects
- `bookings` - Service bookings
- `inventory_items` - Stock inventory
- `payments` - Payment records
- `saved_addresses` - Client addresses
- `notifications` - System notifications

**Relationship Tables:**
- `project_technicians` - Many-to-many project assignments
- `project_inventory` - Inventory allocation to projects
- `inventory_movements` - Inventory transaction history
- `appliances` - Appliances per address

**Supporting Tables:**
- `tasks` - Project tasks
- `calendar_events` - Scheduled events
- `reports` - Service reports
- `documents` - Document management
- `support_tickets` - After-sales support
- `audit_log` - System audit trail
- `idempotency_keys` - Duplicate request prevention

---

## Color Legend for Diagrams

- **Blue (#3498db):** Client-related processes/inputs
- **Orange (#f39c12):** Admin-related processes
- **Green (#16a085):** Technician-related processes
- **Red (#e74c3c):** Error states/rejections
- **Gray (#95a5a6):** Data stores/databases
- **Yellow (#e67e22):** Decision points

---

**Document Version:** 1.0  
**Last Updated:** March 4, 2026  
**Generated For:** GreenSky Solar Capstone Project
