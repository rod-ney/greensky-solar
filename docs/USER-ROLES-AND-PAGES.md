# GreenSky Solar - User Roles and Pages Documentation

## Overview

This document provides a comprehensive guide to all pages and functionalities available in the GreenSky Solar application for each user role. The system is designed for three primary user roles: **Admin**, **Technician**, and **Client**, each with specific access levels and features.

---

## Table of Contents

- [Public Pages](#public-pages)
- [Admin Role](#admin-role)
- [Technician Role](#technician-role)
- [Client Role](#client-role)

---

## Public Pages

Public pages are accessible to all visitors without authentication. These pages serve as the marketing and entry point to the application.

### 1. Landing Page
**Path:** `/`

The main marketing and information hub for GreenSky Solar. Features an auto-rotating hero carousel showcasing solar installation benefits, company statistics, detailed service descriptions, benefits of choosing GreenSky Solar, customer testimonials, and a clear call-to-action section. Includes links to book services, view pricing, and access login/register pages. Full footer with social media links and contact information.

**Create/Add Buttons:** None (view-only)

---

### 2. Login
**Path:** `/login`

User authentication page for existing customers and staff to access their accounts. Features email and password input fields with password visibility toggle, error handling for invalid credentials, "Forgot password?" recovery link, and role-based redirects to appropriate dashboards (Admin, Technician, or Client). Responsive split-layout design with company branding on desktop.

**Create/Add Buttons:** None (authentication form only)

---

### 3. Register
**Path:** `/register`

Account creation page for new clients to join the platform. Registration form collects first name, last name, email address, contact number (10-digit Philippine format with +63 prefix), password with confirmation, and confirmation password with visibility toggles. Form includes validation for all required fields, password matching, and contact number format. Automatically redirects to login page upon successful registration.

**Create/Add Buttons:** None (registration form only)

---

### 4. Pricing
**Path:** `/prices`

Public pricing and service packages page showcasing all available solar services with detailed descriptions, starting prices in Philippine pesos, package comparisons, and value propositions. Displays pricing for Site Inspection (Free), Solar Installation (₱50,000), Commissioning (₱15,000), Inverter & Battery Setup (₱80,000), Maintenance & Repair (₱3,500), and Professional Cleaning (₱2,500). Includes call-to-action buttons to book services or request quotes.

**Create/Add Buttons:** None (view-only)

---

## Admin Role

Administrators manage the entire system, including users, projects, inventory, and business operations. Admins have full access to all features and data across the application.

### Admin Pages

#### 1. Dashboard
**Path:** `/dashboard`

Provides an overview of key business metrics and recent activities. View project statistics and status distribution, active technician count and workload, recent projects with quick links, revenue tracking and trending information, and alerts for pending tasks.

**Create/Add Buttons:** None (view-only)

---

#### 2. Users Management
**Path:** `/users`

Manage all application users across all roles with the ability to view all users (Admin, Technician, Client), filter by role, search by name or email, manage user status, edit details and roles, and delete records with confirmation. Assign roles to users and maintain active/inactive status.

**Create/Add Buttons:** 
**+ Add User** – Create new users with specified roles and credentials

---

#### 3. Technicians Management
**Path:** `/technicians`

Manage technician profiles, specializations, and availability with detailed profiles for all technicians. Track availability status (available, busy, on leave), view specializations like Rooftop Installation, Electrical Systems, and Commercial Systems. Filter by status and specialization, search by name or email, edit contact information and availability, and delete records.

**Create/Add Buttons:** 
**+ Add Technician** – Register new technicians to the system

---

#### 4. Projects Management
**Path:** `/projects`

Create and manage solar installation projects with status indicators (Pending, In Progress, Completed, On Hold). Switch between grid and list views, filter by project status and priority, search by name or location, and assign technicians to projects. Track progress with visual indicators and priority levels (Low, Medium, High). View complete project details including client, location, budget, and timeline.

**Create/Add Buttons:** 
**+ Create Project** – Add new solar installation projects with full details including name, client, location, budget, start/end dates, lead technician, and description

---

#### 5. Bookings Management
**Path:** `/bookings`

Manage all service appointment bookings with status indicators (Scheduled, Confirmed, Completed, Cancelled). Filter by booking status, search by client name or location, edit booking details including date, time, service type, and technician assignment. View service locations on Google Maps, check calendar integration for scheduling conflicts, and delete bookings with confirmation.

**Create/Add Buttons:** None visible on admin page; created through Projects or from client book-now requests

---

#### 6. Inventory Management
**Path:** `/inventory`

Track and manage inventory items and stock levels organized by category (Solar Panels, Inverters, Batteries, Mounting Hardware, Wiring & Cables, Tools, Accessories). Switch between grid and table views, monitor real-time stock levels with low stock alerts and critical warnings, view item details including SKU, quantity, unit price, and supplier information. Filter by category and status, sort by name or price, track inventory movements, and search for quick lookup.

**Create/Add Buttons:** 
**+ Add Item** – Create new inventory items with category, description, quantity, unit price, and supplier information  
**+ Record Movement** – Log inventory adjustments including purchases, usage, transfers, and adjustments

---

#### 7. Invoice Management
**Path:** `/invoice`

Create and manage customer invoices and payments with payment status tracking (Paid, Pending, Overdue, Refunded). View all invoices with visual status indicators, filter by payment status, search by invoice ID or client name, edit invoice details, and delete records. Track service type, amount, due dates, and overdue payments. Manage payment instructions for clients and review invoice history.

**Create/Add Buttons:** 
**+ Create Invoice** – Generate new invoices for clients with service type, amount, due date, and payment instructions

---

#### 8. Reports
**Path:** `/reports`

Generate and manage business reports with multiple report types including Service Reports, Quotations, and Revenue Reports. Filter reports by type and status, search for quick lookup, view report details and generation dates, download reports as documents, and track creation and approval status. Analyze revenue and service metrics for business insights.

**Create/Add Buttons:** 
**+ Create Report** – Generate new reports (Service Report, Quotation, Warranty documents)

---

#### 9. Calendar
**Path:** `/calendar`

Visual timeline and scheduling view of all projects showing project start and end dates, technician assignments, and status indicators. Filter by project status, detect scheduling conflicts, and access project details directly from the calendar.

**Create/Add Buttons:** None (managed through Projects page)

---

#### 10. After-Sales / Warranty Management
**Path:** `/after-sales`

Manage warranty claims and support tickets with warranty status tracking for completed projects. Monitor warranty coverage periods (typically 1 year from completion), track days remaining for each warranty, integrate support ticket system, filter by warranty status (Active, Expired, About to Expire), and view project details with warranty terms.

**Create/Add Buttons:** 
**+ Create Ticket** – Submit new support tickets for warranty claims or issues

---

#### 11. Notifications
**Path:** `/notifications`

System-wide notifications and alerts including notifications for status changes, user assignments, and important events. View all notifications, filter by type and date, mark as read/unread, delete notifications, and archive old messages.

**Create/Add Buttons:** None (system-generated)

---

#### 12. Profile / Settings
**Path:** `/profile`

Admin personal account settings and management options. Update personal information, change password, manage email preferences, configure notifications settings, and adjust system preferences.

**Create/Add Buttons:** None (personal settings only)

---

## Technician Role

Technicians manage their assigned projects, tasks, and service schedules. They have limited access to project-related information and cannot access business analytics or user management features.

### Technician Pages

#### 1. Dashboard
**Path:** `/technician`

Technician's personal overview and task management hub showing assigned projects, tasks with status indicators (Pending, In Progress, Completed), recent projects, workload summary, performance metrics like tasks completed and projects managed, and alerts for urgent items. Quick access to assigned bookings.

**Create/Add Buttons:** None (view assigned work only)

---

#### 2. Projects
**Path:** `/technician/projects`

View and manage assigned projects with project status and progress tracking, location details, client information, and timeline. Filter by project status, search functionality, view project team members and roles, see task breakdown for each project, and track milestones.

**Create/Add Buttons:** 
**+ Create Task** – Add tasks within assigned projects for work items, inspections, and installations

---

#### 3. Calendar
**Path:** `/technician/calendar`

Schedule and timeline view of assigned work showing calendar with assigned project dates, task scheduling and time allocation, booking appointments visualization, conflict detection, and time slot availability. Integration with projects and tasks for comprehensive schedule management.

**Create/Add Buttons:** None (managed through Projects and Tasks)

---

#### 4. Tasks
**Path:** `/technician/tasks`

Detailed task management for field work with status tracking (Open, In Progress, Completed), priority levels, and due dates. Filter by status and priority, search for quick lookup, mark tasks as complete, add notes, and track time spent on each task with time estimates.

**Create/Add Buttons:** None (created through Projects or assigned by admin)

---

#### 5. Reports
**Path:** `/technician/reports`

Submit field work and service reports with templates for consistency. Document field inspection findings, service work completion, upload photos and documents, associate reports with projects or tasks, and track submission history with signature and completion documentation.

**Create/Add Buttons:** 
**+ Submit Report** – Document completed field work and inspections

---

#### 6. Notifications
**Path:** `/technician/notifications`

Personal notifications and alerts including task assignments and updates, project status changes, booking confirmations, schedule changes, and manager messages. Filter by notification type, mark as read/unread, and organize notifications.

**Create/Add Buttons:** None (system-generated)

---

#### 7. Profile
**Path:** `/technician/profile`

Technician personal profile and settings including contact information, specializations, availability status management, password changes, personal preferences, and performance metrics viewing.

**Create/Add Buttons:** None (personal settings only)

---

## Client Role

Clients access the self-service portal to book services, track projects, manage documents, and handle payments. They have the most restricted access, limited to their own projects and bookings.

### Client Pages

#### 1. Dashboard / Home
**Path:** `/client`

Client's main overview and quick access hub with summary of active bookings, upcoming appointments, payment status overview, warranty information summary, and recent project updates. Access quick action buttons for common tasks, personalized welcome message, and important alerts.

**Create/Add Buttons:** 
**Book Now** (+ icon) – Quick access to book new service appointments  
**+ Request Service** – Create new service requests

---

#### 2. Book Now / Service Booking
**Path:** `/client/book-now`

Easy appointment scheduling interface with service type selection, calendar date picker for appointment dates, time slot availability display, address selection and confirmation, service description input, preferred technician selection option, and automatic booking confirmation with reference number. Email confirmation sent automatically.

**Create/Add Buttons:** 
**+ Create Booking** – Submit new service appointment requests

---

#### 3. Bookings
**Path:** `/client/booking`

View and manage all client bookings with status tracking (Scheduled, Confirmed, Completed, Cancelled). Filter by status, search by date or reference number, view complete booking details including date, time, location, technician information, and service type. View technician contact information, access location on Google Maps, and reschedule or cancel bookings when applicable.

**Create/Add Buttons:** None on this page; use "Book Now" page instead

---

#### 4. Calendar
**Path:** `/client/calendar`

    Visual calendar of appointments and projects showing scheduled appointments, project timeline visualization, important dates and deadlines, and upcoming service reminders. Integration with bookings for comprehensive schedule view.

**Create/Add Buttons:** None (view-only)

---

#### 5. Address Management
**Path:** `/client/address`

Manage service locations and addresses by viewing all registered addresses, setting default address for bookings, entering address details (street, barangay, city, postal code), coordinates for service locations (latitude, longitude), editing information, deleting addresses, and quick selection for new bookings.

**Create/Add Buttons:** 
**+ Add Address** – Register new service locations for appointments

---

#### 6. Documents / Files
**Path:** `/client/documents`

Access warranty certificates, permits, compliance documentation, service contracts, installation guides, invoices, and receipts. Search and filter documents by type, download documents, review document history and versions, and upload custom project documentation.

**Create/Add Buttons:** 
**+ Upload Document** – Add custom files for project documentation

---

#### 7. Warranty
**Path:** `/client/warranty`

View active warranties with coverage details and terms including expiration dates, renewal options, and warranty period information (typically 1 year from installation). Access warranty claim process information, contact support links, and download warranty documents.

**Create/Add Buttons:** None (managed by admin)

---

#### 8. Payments / Invoices
**Path:** `/client/payments`

View all invoices with payment status tracking (Paid, Pending, Overdue). Check due date information, view amount due and payment history, filter by payment status, search for invoices, download invoice PDFs, and review payment instructions. Online payment integration available if applicable.

**Create/Add Buttons:** None (invoices created by admin)

---

#### 9. Notifications
**Path:** `/client/notifications`

Personal notifications and alerts including booking confirmations and updates, appointment reminders, project status updates, payment notifications, service reminders, and system announcements. Filter by type, mark as read/unread, and manage notifications.

**Create/Add Buttons:** None (system-generated)

---

#### 10. Profile / Account Settings
**Path:** `/client/profile`

Client personal account management including updating personal information, changing password, managing email addresses, entering contact phone numbers, setting notification preferences, configuring communication preferences, and managing account security settings.

**Create/Add Buttons:** None (personal settings only)

---

## Summary Table: Create/Add Buttons by Role

| Feature | Admin | Technician | Client |
|---------|-------|-----------|--------|
| Add User | ✓ Create User | ✗ | ✗ |
| Add Technician | ✓ Add Technician | ✗ | ✗ |
| Create Project | ✓ Create Project | ✗ | ✗ |
| Create Task | ✗ | ✓ Create Task | ✗ |
| Add Inventory Item | ✓ Add Item | ✗ | ✗ |
| Record Inventory Movement | ✓ Record Movement | ✗ | ✗ |
| Create Invoice | ✓ Create Invoice | ✗ | ✗ |
| Create Report | ✓ Create Report | ✓ Submit Report | ✗ |
| Create Support Ticket | ✓ Create Ticket | ✗ | ✗ |
| Book Service | ✗ | ✗ | ✓ Book Now / Create Booking |
| Add Address | ✗ | ✗ | ✓ Add Address |
| Upload Document | ✗ | ✗ | ✓ Upload Document |

---

## Access Control Summary

### Admin Access
- Full system access
- All management functions
- User role management
- Business analytics and reports
- Inventory and project management
- Financial overview

### Technician Access
- Limited to assigned projects and tasks
- Field work documentation
- Task completion tracking
- Schedule and calendar management
- Cannot manage users or create new projects
- Cannot access financial or inventory management

### Client Access
- Self-service booking system
- Personal project and booking tracking
- Document download access
- Payment history viewing
- Address management for service locations
- Cannot access system management or user data

---

## Notes for Administrators

1. **User Roles:** Always verify user role assignments to ensure proper access levels.
2. **Data Privacy:** Client data is isolated; clients can only see their own information.
3. **Notifications:** System generates automatic notifications for status changes and important updates.
4. **Archiving:** Old records can be archived but not permanently deleted for audit purposes.
5. **Reporting:** All business reports are accessible to admin for analysis and decision-making.

---

## Contact & Support

For system access issues or role management questions, contact the system administrator.

