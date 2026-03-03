# GreenSky Solar System - Detailed IPO Diagrams

## Input-Process-Output Analysis for All Major Modules

---

## 1. Booking Management Module

```mermaid
flowchart LR
    subgraph Input["📥 INPUTS"]
        I1[Client Information<br/>name, email, phone]
        I2[Service Type<br/>inspection, installation,<br/>maintenance, etc.]
        I3[Preferred Date & Time]
        I4[Service Address<br/>coordinates, details]
        I5[Site Profile<br/>appliances, monthly bill]
        I6[Special Requirements<br/>notes]
    end
    
    subgraph Process["⚙️ PROCESSES"]
        P1[Validate Input Data]
        P2[Check Slot Availability<br/>date/time conflicts]
        P3[Generate Booking<br/>Reference BK-XXXX]
        P4[Assign Initial Status<br/>pending/confirmed]
        P5[Store in Database]
        P6[Send Notifications<br/>client & admin]
        P7[Create Calendar Event]
    end
    
    subgraph Output["📤 OUTPUTS"]
        O1[Booking Confirmation<br/>reference number]
        O2[Email Notification<br/>to client]
        O3[Admin Dashboard<br/>new booking alert]
        O4[Calendar Entry<br/>scheduled date]
        O5[Booking Record<br/>in database]
        O6[Payment Estimate<br/>if applicable]
    end
    
    I1 --> P1
    I2 --> P1
    I3 --> P1
    I4 --> P1
    I5 --> P1
    I6 --> P1
    
    P1 --> P2
    P2 --> P3
    P3 --> P4
    P4 --> P5
    P5 --> P6
    P6 --> P7
    
    P3 --> O1
    P6 --> O2
    P6 --> O3
    P7 --> O4
    P5 --> O5
    P4 --> O6
    
    style Input fill:#e3f2fd,stroke:#2196f3,stroke-width:3px
    style Process fill:#fff3e0,stroke:#ff9800,stroke-width:3px
    style Output fill:#e8f5e9,stroke:#4caf50,stroke-width:3px
```

---

## 2. Project Management Module

```mermaid
flowchart LR
    subgraph Input["📥 INPUTS"]
        I1[Project Details<br/>name, description]
        I2[Client Information<br/>from booking]
        I3[Location & Address]
        I4[Start & End Dates]
        I5[Budget Amount]
        I6[Priority Level<br/>low/medium/high]
        I7[Project Lead<br/>technician]
        I8[Assigned Team<br/>technicians]
    end
    
    subgraph Process["⚙️ PROCESSES"]
        P1[Validate Project Data]
        P2[Link to Booking<br/>if applicable]
        P3[Generate Project ID]
        P4[Assign Technicians]
        P5[Initialize Progress<br/>0% status pending]
        P6[Store in Database]
        P7[Notify Stakeholders<br/>client, technicians]
        P8[Create Task List]
        P9[Schedule Calendar<br/>Events]
    end
    
    subgraph Output["📤 OUTPUTS"]
        O1[Project Record<br/>unique ID]
        O2[Technician<br/>Assignments]
        O3[Task List<br/>initialization]
        O4[Client Notification<br/>project created]
        O5[Calendar Events<br/>milestones]
        O6[Admin Dashboard<br/>update]
        O7[Project Timeline<br/>Gantt view]
    end
    
    I1 --> P1
    I2 --> P1
    I3 --> P1
    I4 --> P1
    I5 --> P1
    I6 --> P1
    I7 --> P1
    I8 --> P1
    
    P1 --> P2
    P2 --> P3
    P3 --> P4
    P4 --> P5
    P5 --> P6
    P6 --> P7
    P7 --> P8
    P8 --> P9
    
    P3 --> O1
    P4 --> O2
    P8 --> O3
    P7 --> O4
    P9 --> O5
    P6 --> O6
    P9 --> O7
    
    style Input fill:#e3f2fd,stroke:#2196f3,stroke-width:3px
    style Process fill:#fff3e0,stroke:#ff9800,stroke-width:3px
    style Output fill:#e8f5e9,stroke:#4caf50,stroke-width:3px
```

---

## 3. Inventory Management Module

```mermaid
flowchart LR
    subgraph Input["📥 INPUTS"]
        I1[Item Details<br/>name, SKU, category]
        I2[Stock Quantity]
        I3[Minimum Stock<br/>Threshold]
        I4[Unit Price]
        I5[Supplier Info]
        I6[Location/Warehouse]
        I7[Project Allocation<br/>Request]
        I8[Quantity Needed]
    end
    
    subgraph Process["⚙️ PROCESSES"]
        P1[Validate Item Data]
        P2[Check Stock<br/>Availability]
        P3[Calculate Total<br/>Cost]
        P4[Create Deduction<br/>Movement]
        P5[Update Inventory<br/>Quantity]
        P6[Check Min Stock<br/>Threshold]
        P7[Create Allocation<br/>Record]
        P8[Generate Alert<br/>if low stock]
        P9[Log Movement<br/>in History]
    end
    
    subgraph Output["📤 OUTPUTS"]
        O1[Updated Inventory<br/>Stock Levels]
        O2[Allocation Record<br/>project link]
        O3[Movement History<br/>audit trail]
        O4[Low Stock Alert<br/>if threshold met]
        O5[Purchase Request<br/>if insufficient]
        O6[Project Inventory<br/>List]
        O7[Cost Calculation<br/>for project]
    end
    
    I1 --> P1
    I2 --> P1
    I3 --> P1
    I4 --> P1
    I5 --> P1
    I6 --> P1
    I7 --> P2
    I8 --> P2
    
    P1 --> P2
    P2 --> P3
    P3 --> P4
    P4 --> P5
    P5 --> P6
    P6 --> P7
    P7 --> P8
    P8 --> P9
    
    P5 --> O1
    P7 --> O2
    P9 --> O3
    P8 --> O4
    P2 --> O5
    P7 --> O6
    P3 --> O7
    
    style Input fill:#e3f2fd,stroke:#2196f3,stroke-width:3px
    style Process fill:#fff3e0,stroke:#ff9800,stroke-width:3px
    style Output fill:#e8f5e9,stroke:#4caf50,stroke-width:3px
```

---

## 4. Payment & Invoice Module

```mermaid
flowchart LR
    subgraph Input["📥 INPUTS"]
        I1[Service Type<br/>installation, maintenance]
        I2[Amount Due]
        I3[Client Information<br/>user ID, email]
        I4[Due Date]
        I5[Payment Instructions<br/>GCash, Bank, etc.]
        I6[Payment Method<br/>selected by client]
        I7[Payment Proof<br/>upload/reference]
    end
    
    subgraph Process["⚙️ PROCESSES"]
        P1[Generate Invoice<br/>Number INV-XXXX]
        P2[Calculate Total<br/>Amount & Tax]
        P3[Create Payment<br/>Record]
        P4[Set Status<br/>pending/paid]
        P5[Create Document<br/>Entry]
        P6[Send Invoice<br/>Notification]
        P7[Verify Payment<br/>admin review]
        P8[Update Status<br/>to Paid]
        P9[Trigger Workflow<br/>if downpayment]
    end
    
    subgraph Output["📤 OUTPUTS"]
        O1[Invoice Document<br/>INV-XXXX]
        O2[Payment Record<br/>in database]
        O3[Client Notification<br/>invoice sent]
        O4[Payment<br/>Confirmation]
        O5[Receipt/Proof<br/>document]
        O6[Project Status<br/>Update]
        O7[Financial Report<br/>entry]
        O8[Schedule Installation<br/>if 50% paid]
    end
    
    I1 --> P1
    I2 --> P1
    I3 --> P1
    I4 --> P1
    I5 --> P1
    I6 --> P7
    I7 --> P7
    
    P1 --> P2
    P2 --> P3
    P3 --> P4
    P4 --> P5
    P5 --> P6
    P6 --> P7
    P7 --> P8
    P8 --> P9
    
    P1 --> O1
    P3 --> O2
    P6 --> O3
    P8 --> O4
    P8 --> O5
    P9 --> O6
    P3 --> O7
    P9 --> O8
    
    style Input fill:#e3f2fd,stroke:#2196f3,stroke-width:3px
    style Process fill:#fff3e0,stroke:#ff9800,stroke-width:3px
    style Output fill:#e8f5e9,stroke:#4caf50,stroke-width:3px
```

---

## 5. User Authentication Module

```mermaid
flowchart LR
    subgraph Input["📥 INPUTS"]
        I1[Email Address]
        I2[Password]
        I3[User Agent<br/>browser info]
        I4[IP Address]
        I5[Registration Data<br/>name, role]
        I6[Reset Token<br/>password reset]
    end
    
    subgraph Process["⚙️ PROCESSES"]
        P1[Validate Email<br/>Format]
        P2[Hash Password<br/>bcrypt]
        P3[Query Database<br/>user lookup]
        P4[Compare Password<br/>Hash]
        P5[Generate Session<br/>Token]
        P6[Set HTTP-only<br/>Cookie]
        P7[Record Login<br/>Activity]
        P8[Check User Role]
        P9[Apply Authorization<br/>Rules]
    end
    
    subgraph Output["📤 OUTPUTS"]
        O1[Session Token<br/>secure cookie]
        O2[User Profile<br/>role, permissions]
        O3[Login Activity<br/>Log]
        O4[Dashboard Route<br/>role-based]
        O5[Authentication<br/>Status]
        O6[Error Message<br/>if failed]
        O7[Password Reset<br/>Email]
    end
    
    I1 --> P1
    I2 --> P2
    I3 --> P7
    I4 --> P7
    I5 --> P2
    I6 --> P2
    
    P1 --> P3
    P2 --> P3
    P3 --> P4
    P4 --> P5
    P5 --> P6
    P6 --> P7
    P7 --> P8
    P8 --> P9
    
    P6 --> O1
    P8 --> O2
    P7 --> O3
    P9 --> O4
    P5 --> O5
    P4 --> O6
    P2 --> O7
    
    style Input fill:#e3f2fd,stroke:#2196f3,stroke-width:3px
    style Process fill:#fff3e0,stroke:#ff9800,stroke-width:3px
    style Output fill:#e8f5e9,stroke:#4caf50,stroke-width:3px
```

---

## 6. Calendar & Scheduling Module

```mermaid
flowchart LR
    subgraph Input["📥 INPUTS"]
        I1[Event Title]
        I2[Event Date & Time]
        I3[End Date<br/>optional]
        I4[Event Type<br/>installation, inspection]
        I5[Project Link<br/>project ID]
        I6[Assigned Users<br/>technicians]
        I7[Location/Address]
    end
    
    subgraph Process["⚙️ PROCESSES"]
        P1[Validate Date<br/>Range]
        P2[Check Conflicts<br/>overlapping events]
        P3[Generate Event ID]
        P4[Assign Color Code<br/>by type]
        P5[Store in Database]
        P6[Notify Assigned<br/>Users]
        P7[Update Project<br/>Schedule]
        P8[Sync Availability]
    end
    
    subgraph Output["📤 OUTPUTS"]
        O1[Calendar Event<br/>record]
        O2[Event Notification<br/>to users]
        O3[Calendar View<br/>monthly/weekly]
        O4[Technician<br/>Schedule]
        O5[Booking<br/>Confirmation]
        O6[Project Timeline<br/>update]
        O7[Availability<br/>Status]
    end
    
    I1 --> P1
    I2 --> P1
    I3 --> P1
    I4 --> P1
    I5 --> P1
    I6 --> P1
    I7 --> P1
    
    P1 --> P2
    P2 --> P3
    P3 --> P4
    P4 --> P5
    P5 --> P6
    P6 --> P7
    P7 --> P8
    
    P5 --> O1
    P6 --> O2
    P5 --> O3
    P8 --> O4
    P5 --> O5
    P7 --> O6
    P8 --> O7
    
    style Input fill:#e3f2fd,stroke:#2196f3,stroke-width:3px
    style Process fill:#fff3e0,stroke:#ff9800,stroke-width:3px
    style Output fill:#e8f5e9,stroke:#4caf50,stroke-width:3px
```

---

## 7. Reporting Module

```mermaid
flowchart LR
    subgraph Input["📥 INPUTS"]
        I1[Report Title]
        I2[Report Type<br/>service, quotation,<br/>revenue]
        I3[Project Link<br/>if applicable]
        I4[Amount<br/>financial data]
        I5[Description<br/>details]
        I6[Submitted By<br/>technician/admin]
        I7[Attachments<br/>photos, documents]
    end
    
    subgraph Process["⚙️ PROCESSES"]
        P1[Validate Report<br/>Data]
        P2[Generate Report ID]
        P3[Set Status<br/>pending approval]
        P4[Store in Database]
        P5[Notify Admin<br/>for review]
        P6[Admin Reviews<br/>Report]
        P7[Approve/Reject<br/>Decision]
        P8[Update Status]
        P9[Notify Submitter]
    end
    
    subgraph Output["📤 OUTPUTS"]
        O1[Report Record<br/>in database]
        O2[Admin Notification<br/>review needed]
        O3[Approval Status<br/>approved/rejected]
        O4[Submitter<br/>Notification]
        O5[Project Report<br/>Link]
        O6[Financial Summary<br/>if revenue report]
        O7[Document Creation<br/>if approved]
    end
    
    I1 --> P1
    I2 --> P1
    I3 --> P1
    I4 --> P1
    I5 --> P1
    I6 --> P1
    I7 --> P1
    
    P1 --> P2
    P2 --> P3
    P3 --> P4
    P4 --> P5
    P5 --> P6
    P6 --> P7
    P7 --> P8
    P8 --> P9
    
    P4 --> O1
    P5 --> O2
    P8 --> O3
    P9 --> O4
    P4 --> O5
    P4 --> O6
    P8 --> O7
    
    style Input fill:#e3f2fd,stroke:#2196f3,stroke-width:3px
    style Process fill:#fff3e0,stroke:#ff9800,stroke-width:3px
    style Output fill:#e8f5e9,stroke:#4caf50,stroke-width:3px
```

---

## 8. Notification System Module

```mermaid
flowchart LR
    subgraph Input["📥 INPUTS"]
        I1[Event Type<br/>booking, payment, task]
        I2[Target User<br/>user ID, role]
        I3[Notification Title]
        I4[Message Content]
        I5[Link to Resource<br/>URL]
        I6[Metadata<br/>JSON data]
        I7[Trigger Event<br/>system action]
    end
    
    subgraph Process["⚙️ PROCESSES"]
        P1[Detect Event<br/>Trigger]
        P2[Determine<br/>Notification Type]
        P3[Identify Target<br/>Users by Role]
        P4[Format Message<br/>Template]
        P5[Generate<br/>Notification ID]
        P6[Store in Database]
        P7[Update Unread<br/>Count]
        P8[Send Email<br/>if configured]
        P9[Push to Client<br/>real-time]
    end
    
    subgraph Output["📤 OUTPUTS"]
        O1[Notification Record<br/>in database]
        O2[Unread Count<br/>updated]
        O3[In-App Alert<br/>bell icon]
        O4[Email Notification<br/>external]
        O5[User Dashboard<br/>notification list]
        O6[Read Status<br/>tracking]
        O7[Click Navigation<br/>to resource]
    end
    
    I1 --> P1
    I2 --> P1
    I3 --> P1
    I4 --> P1
    I5 --> P1
    I6 --> P1
    I7 --> P1
    
    P1 --> P2
    P2 --> P3
    P3 --> P4
    P4 --> P5
    P5 --> P6
    P6 --> P7
    P7 --> P8
    P8 --> P9
    
    P6 --> O1
    P7 --> O2
    P9 --> O3
    P8 --> O4
    P6 --> O5
    P6 --> O6
    P4 --> O7
    
    style Input fill:#e3f2fd,stroke:#2196f3,stroke-width:3px
    style Process fill:#fff3e0,stroke:#ff9800,stroke-width:3px
    style Output fill:#e8f5e9,stroke:#4caf50,stroke-width:3px
```

---

## 9. After-Sales Support Module

```mermaid
flowchart LR
    subgraph Input["📥 INPUTS"]
        I1[Client Name]
        I2[Client Email]
        I3[Project Reference<br/>optional]
        I4[Issue Subject]
        I5[Issue Description<br/>details]
        I6[Priority Level<br/>low/high]
        I7[Photos/Attachments]
    end
    
    subgraph Process["⚙️ PROCESSES"]
        P1[Validate Ticket<br/>Data]
        P2[Generate Ticket ID]
        P3[Set Initial Status<br/>open]
        P4[Store in Database]
        P5[Notify Support<br/>Team Admin]
        P6[Assign Technician<br/>if needed]
        P7[Admin Updates<br/>Status]
        P8[Resolution Process]
        P9[Close Ticket]
    end
    
    subgraph Output["📤 OUTPUTS"]
        O1[Support Ticket<br/>record]
        O2[Ticket Number<br/>reference]
        O3[Admin Alert<br/>new ticket]
        O4[Status Updates<br/>in_progress/resolved]
        O5[Client Notification<br/>status change]
        O6[Resolution Notes<br/>documentation]
        O7[Project Link<br/>if warranty issue]
    end
    
    I1 --> P1
    I2 --> P1
    I3 --> P1
    I4 --> P1
    I5 --> P1
    I6 --> P1
    I7 --> P1
    
    P1 --> P2
    P2 --> P3
    P3 --> P4
    P4 --> P5
    P5 --> P6
    P6 --> P7
    P7 --> P8
    P8 --> P9
    
    P4 --> O1
    P2 --> O2
    P5 --> O3
    P7 --> O4
    P7 --> O5
    P8 --> O6
    P4 --> O7
    
    style Input fill:#e3f2fd,stroke:#2196f3,stroke-width:3px
    style Process fill:#fff3e0,stroke:#ff9800,stroke-width:3px
    style Output fill:#e8f5e9,stroke:#4caf50,stroke-width:3px
```

---

## 10. Document Management Module

```mermaid
flowchart LR
    subgraph Input["📥 INPUTS"]
        I1[Document Title]
        I2[Document Type<br/>contract, invoice,<br/>warranty, permit]
        I3[File Upload<br/>PDF/Image]
        I4[Project Link<br/>if applicable]
        I5[Client/User ID]
        I6[Expiry Date<br/>for warranties]
        I7[Approval Required<br/>flag]
    end
    
    subgraph Process["⚙️ PROCESSES"]
        P1[Validate File<br/>Type & Size]
        P2[Generate<br/>Document ID]
        P3[Calculate File<br/>Size]
        P4[Store File<br/>in Storage]
        P5[Create Database<br/>Record]
        P6[Set Approval<br/>Status pending]
        P7[Notify User<br/>document available]
        P8[Admin Reviews<br/>if required]
        P9[Update Status<br/>active/approved]
    end
    
    subgraph Output["📤 OUTPUTS"]
        O1[Document Record<br/>in database]
        O2[File URL<br/>access link]
        O3[Client Notification<br/>document ready]
        O4[Document List<br/>user portal]
        O5[Approval Status<br/>approved/pending]
        O6[Project Documents<br/>linked]
        O7[Download Access<br/>secure link]
    end
    
    I1 --> P1
    I2 --> P1
    I3 --> P1
    I4 --> P1
    I5 --> P1
    I6 --> P1
    I7 --> P1
    
    P1 --> P2
    P2 --> P3
    P3 --> P4
    P4 --> P5
    P5 --> P6
    P6 --> P7
    P7 --> P8
    P8 --> P9
    
    P5 --> O1
    P4 --> O2
    P7 --> O3
    P5 --> O4
    P9 --> O5
    P5 --> O6
    P4 --> O7
    
    style Input fill:#e3f2fd,stroke:#2196f3,stroke-width:3px
    style Process fill:#fff3e0,stroke:#ff9800,stroke-width:3px
    style Output fill:#e8f5e9,stroke:#4caf50,stroke-width:3px
```

---

## Summary Table: All Modules IPO

| Module | Key Inputs | Key Processes | Key Outputs |
|--------|------------|---------------|-------------|
| **Booking** | Client info, Service type, Date/time, Address | Validate, Check slots, Generate ref, Notify | Confirmation, Notification, Calendar entry |
| **Project** | Project details, Client, Dates, Budget, Team | Create project, Assign team, Initialize tasks | Project record, Assignments, Timeline |
| **Inventory** | Item details, Stock qty, Min threshold, Project allocation | Check stock, Allocate, Update quantity, Alert | Stock update, Allocation record, Alerts |
| **Payment** | Amount, Client, Due date, Method | Generate invoice, Verify payment, Update status | Invoice, Receipt, Status update, Trigger |
| **Authentication** | Email, Password, IP, User agent | Hash password, Validate, Create session | Session token, User profile, Login log |
| **Calendar** | Event details, Date, Type, Users | Validate, Check conflicts, Store, Notify | Calendar event, Schedule, Notifications |
| **Reports** | Title, Type, Project, Amount | Validate, Generate ID, Admin review, Approve | Report record, Approval status, Document |
| **Notifications** | Event type, Target user, Message | Detect event, Format, Store, Push, Email | Notification record, Alert, Email |
| **After-Sales** | Client, Issue, Description | Create ticket, Assign, Update status, Resolve | Ticket record, Status updates, Resolution |
| **Documents** | Title, Type, File, Project | Upload, Store, Create record, Approve | Document record, File URL, Access link |

---

**Document Version:** 1.0  
**Last Updated:** March 4, 2026  
**Purpose:** Detailed Input-Process-Output analysis for GreenSky Solar capstone documentation
