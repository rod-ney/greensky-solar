# Capstone Proposed System Process Flowchart (Booking + Project Management)

Use this exact prompt in your flowchart AI tool:

Create a professional swimlane flowchart for our proposed Solar Management System with three lanes: Client, Admin, and Technician. Show one connected end-to-end process from client address creation up to project completion and client confirmation.

Start with Client creates address in /client/address and provides required site profiling details: full address, map pin/coordinates, appliances list, and average monthly Meralco bill. Then proceed to submit booking request in /client/book-now (service type, preferred date/time, selected address, notes). Route to Admin reviews booking in /bookings and add decision: Slot available? If no, update booking to Pending Reschedule, notify client, and loop back to client date/time selection. If yes, set booking status to Confirmed.

After booking confirmation, Admin creates project in /projects (scope, timeline, budget, target completion date), links the booking reference, and prepares quotation in /invoice. Send quotation to client and add decision: Client agrees to quotation? If no, return to quotation revision and resend. If yes, client pays 50% downpayment and Admin records payment before project mobilization.

After downpayment is recorded, Admin schedules the solar installation date in /calendar. Then Admin assigns technician from /technicians based on availability and specialization. Add decision: Technician available? If no, set project status to On Hold and return to technician selection/schedule adjustment. If yes, set project status to In Progress and proceed.

Before field work starts, Admin checks required materials in /inventory. Add decision: Stock sufficient? If yes, reserve/deduct materials and continue execution. If no, create purchase request, receive items, update stock status (In Stock, Low Stock, Out of Stock), then continue.

Technician receives assigned project in /technician/projects, starts tasks in /technician/tasks, and updates task status flow (To Do -> In Progress -> Completed). Technician submits progress or completion report in /technician/reports.

Admin monitors project timeline in /calendar and reviews submitted updates/reports. Add decision: Project completed and approved? If no, return to pending remaining tasks and continue execution loop. If yes, set project status to Completed, set booking status to Completed, issue final billing for remaining 50%, and record final payment.

End flow with Client receives completion confirmation in /client/notifications and sees updated project/booking records.

Use these exact shape and arrow standards in the diagram:
- Terminator (rounded) for Start/End nodes
- Rectangle for process/action steps
- Diamond for decision points
- Parallelogram for input/output steps (data entry, payments, notifications)
- Document shape for reports/records (optional)
- Solid one-way arrow (→) for normal flow
- Labeled arrows "Yes" and "No" from decision diamonds
- Loop-back arrow for retry/rework paths

Include status labels on key steps:
- Booking: Pending, Confirmed, Pending Reschedule, Completed, Cancelled
- Project: Pending, In Progress, On Hold, Completed
- Task: To Do, In Progress, Completed
- Inventory: In Stock, Low Stock, Out of Stock
- Payment: Quotation Sent, 50% Downpayment Paid, Remaining 50% Paid, Fully Paid

Use clear directional arrows, decision diamonds, and process rectangles. Keep layout left-to-right and minimize crossing connectors.

---

## Mermaid Version (Ready to Render)

```mermaid
flowchart LR
  %% Swimlanes
  subgraph C[Client]
    C0([Start])
    C1[/Create address + site profile\n/client/address\n(full address, map pin, appliances, avg monthly Meralco bill)/]
    C2[/Submit booking request\n/client/book-now/]
    C3[Reselect date/time]
    C4[/Review quotation/]
    C5{Agree to quotation?}
    C6[/Pay 50% downpayment/]
    C7[/Pay remaining 50% final payment/]
    C8([End: Receive completion confirmation\n/client/notifications])
  end

  subgraph A[Admin]
    A1[Review booking\n/bookings]
    D1{Slot available?}
    A2[Set booking = Confirmed]
    A3[Create project + link booking\n/projects]
    A12[Prepare/send quotation\n/invoice]
    A13[Record 50% downpayment]
    A16[Schedule solar installation\n/calendar]
    A4[Assign technician\n/technicians]
    D2{Technician available?}
    A5[Set project = On Hold]
    A6[Check inventory\n/inventory]
    D3{Stock sufficient?}
    A7[Reserve/deduct materials]
    A8[Create purchase request\nReceive items\nUpdate stock]
    A9[Monitor timeline\n/calendar]
    D4{Project completed\nand approved?}
    A10[Set project = Completed\nSet booking = Completed]
    A14[Issue final bill 50%\n/invoice]
    A15[Record final payment = Fully Paid]
    A11[/Send completion notification/]
  end

  subgraph T[Technician]
    T1[Receive assigned project\n/technician/projects]
    T2[Execute tasks\n/technician/tasks]
    T3[Update task status\nTo Do -> In Progress -> Completed]
    T4[Submit report\n/technician/reports]
  end

  C0 --> C1 --> C2 --> A1 --> D1
  D1 -- No --> C3 --> C2
  D1 -- Yes --> A2 --> A3 --> A12 --> C4 --> C5

  C5 -- No --> A12
  C5 -- Yes --> C6 --> A13 --> A16 --> A4 --> D2

  D2 -- No --> A5 --> A4
  D2 -- Yes --> A6 --> D3

  D3 -- Yes --> A7 --> T1
  D3 -- No --> A8 --> A6

  T1 --> T2 --> T3 --> T4 --> A9 --> D4
  D4 -- No --> T2
  D4 -- Yes --> A10 --> A14 --> C7 --> A15 --> A11 --> C8
```
