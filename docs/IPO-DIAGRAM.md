# GreenSky Solar - IPO (Input-Process-Output) Diagram

This document describes the main system processes using IPO notation: **Input** → **Process** → **Output**.

---

## System Overview IPO

```mermaid
flowchart LR
    subgraph Inputs
        I1[User Credentials]
        I2[Booking Request]
        I3[Project Details]
        I4[Task Data]
        I5[Payment Info]
        I6[Report Data]
        I7[Document Upload]
    end

    subgraph Processes
        P1[Authentication]
        P2[Booking Management]
        P3[Project Management]
        P4[Task Assignment]
        P5[Payment Processing]
        P6[Report Generation]
        P7[Document Management]
    end

    subgraph Outputs
        O1[Session]
        O2[Booking Confirmation]
        O3[Project Record]
        O4[Task Status]
        O5[Payment Record]
        O6[Report]
        O7[Document]
    end

    I1 --> P1 --> O1
    I2 --> P2 --> O2
    I3 --> P3 --> O3
    I4 --> P4 --> O4
    I5 --> P5 --> O5
    I6 --> P6 --> O6
    I7 --> P7 --> O7
```

---

## 1. Authentication (Login/Register)

```mermaid
flowchart LR
    subgraph Input
        direction TB
        A1[Email]
        A2[Password]
        A3[Name, Contact, Role]
    end

    subgraph Process
        direction TB
        B1[Validate credentials]
        B2[Check user exists]
        B3[Create session cookies]
        B4[Store in users table]
    end

    subgraph Output
        direction TB
        C1[Session cookies]
        C2[Redirect to role-based dashboard]
        C3[User record]
    end

    Input --> Process --> Output
```

| Input | Process | Output |
|-------|---------|--------|
| Email, password | Validate, check DB, hash verify | Session, redirect |
| Name, email, password, contact number | Create user, hash password, insert | User record, redirect to login |

---

## 2. Booking Creation

```mermaid
flowchart LR
    subgraph Input
        direction TB
        A1[Service Type]
        A2[Date and Time]
        A3[Address]
        A4[Notes]
        A5[User ID from session]
    end

    subgraph Process
        direction TB
        B1[Validate required fields]
        B2[Generate BK-XXXX reference]
        B3[Insert into bookings table]
        B4[Link to user_id]
    end

    subgraph Output
        direction TB
        C1[Booking with ID]
        C2[Reference number]
        C3[Pending status]
    end

    Input --> Process --> Output
```

| Input | Process | Output |
|-------|---------|--------|
| serviceType, date, time, address, notes, userId | Validate, generate ref, insert booking | Booking (id, referenceNo, status: pending) |

---

## 3. Project Creation

```mermaid
flowchart LR
    subgraph Input
        direction TB
        A1[Project Name]
        A2[Client or Booking ID]
        A3[Location]
        A4[Start/End Date]
        A5[Budget, Priority]
        A6[Project Lead]
        A7[Description]
    end

    subgraph Process
        direction TB
        B1[Validate required fields]
        B2[Optionally create solar booking]
        B3[Generate proj-XXX ID]
        B4[Insert project]
        B5[Link booking_id if applicable]
        B6[Assign project_technicians]
    end

    subgraph Output
        direction TB
        C1[Project record]
        C2[Linked booking if new]
        C3[Task list empty]
    end

    Input --> Process --> Output
```

| Input | Process | Output |
|-------|---------|--------|
| name, client, location, dates, budget, priority, projectLead, bookingId? | Validate, create booking if needed, insert project, assign technicians | Project with id, status: pending |

---

## 4. Task Management

```mermaid
flowchart LR
    subgraph Input
        direction TB
        A1[Task Title]
        A2[Description]
        A3[Assigned Technician]
        A4[Due Date]
        A5[Priority]
        A6[Status Update]
    end

    subgraph Process
        direction TB
        B1[Validate task data]
        B2[Insert or update task]
        B3[Recalculate project progress]
        B4[Update tasks table]
    end

    subgraph Output
        direction TB
        C1[Task record]
        C2[Updated project progress %]
    end

    Input --> Process --> Output
```

| Input | Process | Output |
|-------|---------|--------|
| title, description, assignedTo, dueDate, priority | Insert task, recalc progress | Task id, project progress updated |
| taskId, status | Update task status | Updated task, progress % |

---

## 5. Report Submission

```mermaid
flowchart LR
    subgraph Input
        direction TB
        A1[Report Type]
        A2[Title, Description]
        A3[Project ID]
        A4[Amount]
        A5[Submitted By]
    end

    subgraph Process
        direction TB
        B1[Validate report data]
        B2[Generate report ID]
        B3[Insert into reports table]
        B4[Admin approval workflow]
    end

    subgraph Output
        direction TB
        C1[Report record]
        C2[Status: pending]
        C3[Approval/Rejection]
    end

    Input --> Process --> Output
```

| Input | Process | Output |
|-------|---------|--------|
| type, title, description, projectId, amount | Insert report, await approval | Report (status: pending/approved/rejected) |

---

## 6. Invoice Creation

```mermaid
flowchart LR
    subgraph Input
        direction TB
        A1[Client ID]
        A2[Amount]
        A3[Description]
        A4[Booking Reference]
    end

    subgraph Process
        direction TB
        B1[Validate amount and client]
        B2[Generate invoice number]
        B3[Create invoice record]
        B4[Link to client documents]
    end

    subgraph Output
        direction TB
        C1[Invoice record]
        C2[Appears in client Payments]
    end

    Input --> Process --> Output
```

| Input | Process | Output |
|-------|---------|--------|
| clientId, amount, description, bookingRef | Validate, generate invoice no, create | Invoice, visible in client portal |

---

## 7. Address Management

```mermaid
flowchart LR
    subgraph Input
        direction TB
        A1[Label, Full Address]
        A2[City, Province, Zip]
        A3[Coordinates]
        A4[Appliances]
        A5[Monthly Bill]
    end

    subgraph Process
        direction TB
        B1[Validate address data]
        B2[Create/Update saved_addresses]
        B3[Link appliances if any]
    end

    subgraph Output
        direction TB
        C1[Saved address]
        C2[Available for booking]
    end

    Input --> Process --> Output
```

| Input | Process | Output |
|-------|---------|--------|
| label, fullAddress, city, province, zipCode, appliances, monthlyBill | Validate, insert address + appliances | SavedAddress for booking selection |

---

## 8. Document Management

```mermaid
flowchart LR
    subgraph Input
        direction TB
        A1[Document File]
        A2[Title, Type]
        A3[User ID]
        A4[Approval Status]
    end

    subgraph Process
        direction TB
        B1[Store document]
        B2[Link to user]
        B3[Admin approve/reject]
    end

    subgraph Output
        direction TB
        C1[Document record]
        C2[Status: active/expired/draft]
    end

    Input --> Process --> Output
```

---

## 9. Payment Processing

```mermaid
flowchart LR
    subgraph Input
        direction TB
        A1[Booking Reference]
        A2[Amount]
        A3[Payment Method]
        A4[Status]
    end

    subgraph Process
        direction TB
        B1[Link to booking_ref]
        B2[Store payment record]
        B3[Update status]
    end

    subgraph Output
        direction TB
        C1[Payment record]
        C2[Status: paid/pending/overdue]
    end

    Input --> Process --> Output
```

---

## Summary Table

| Module | Key Inputs | Key Outputs |
|--------|------------|-------------|
| Auth | email, password | session, user |
| Booking | serviceType, date, time, address | Booking (BK-XXXX) |
| Project | name, client, location, dates, budget | Project (proj-XXX) |
| Task | title, assignedTo, dueDate | Task, progress % |
| Report | type, title, projectId | Report |
| Invoice | clientId, amount | Invoice |
| Address | address, appliances | SavedAddress |
| Document | file, type | Document |
| Payment | bookingRef, amount, method | Payment |
