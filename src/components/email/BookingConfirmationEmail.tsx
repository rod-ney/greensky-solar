import type { Booking } from "@/types/client";
import { SERVICE_LABELS } from "@/lib/constants";

interface BookingConfirmationEmailProps {
  booking: Booking;
  customerName?: string;
}

export function BookingConfirmationEmail({
  booking,
  customerName = "Valued Customer",
}: BookingConfirmationEmailProps) {
  const serviceLabel = SERVICE_LABELS[booking.serviceType] ?? booking.serviceType;
  const formattedDate = new Date(booking.date).toLocaleDateString("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        maxWidth: "600px",
        margin: "0 auto",
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        overflow: "hidden",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: "#118C3A",
          padding: "24px 32px",
          textAlign: "center",
        }}
      >
        <img
          src="/logo_greensky.png"
          alt="GreenSky Solar"
          width="140"
          height="42"
          style={{ display: "block", margin: "0 auto 12px auto", maxWidth: "140px", height: "auto" }}
        />
        <div style={{ color: "#ffffff", fontSize: "20px", fontWeight: "bold" }}>
          GreenSky Solar
        </div>
        <div style={{ color: "rgba(255,255,255,0.9)", fontSize: "14px", marginTop: "4px" }}>
          Sustainable Energy Solutions
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "32px" }}>
        <h1
          style={{
            fontSize: "22px",
            fontWeight: "bold",
            color: "#1e293b",
            margin: "0 0 8px 0",
          }}
        >
          Booking Confirmed
        </h1>
        <p
          style={{
            fontSize: "15px",
            color: "#64748b",
            margin: "0 0 24px 0",
            lineHeight: 1.6,
          }}
        >
          Dear {customerName},
        </p>
        <p
          style={{
            fontSize: "15px",
            color: "#475569",
            margin: "0 0 24px 0",
            lineHeight: 1.6,
          }}
        >
          Thank you for booking with GreenSky Solar. Your appointment has been confirmed. Please find the details below.
        </p>

        {/* Booking Details Card */}
        <div
          style={{
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "8px",
            padding: "20px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: "600",
              color: "#118C3A",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "12px",
            }}
          >
            Reference: {booking.referenceNo}
          </div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "14px",
            }}
          >
            <tbody>
              <tr>
                <td style={{ padding: "8px 0", color: "#64748b", width: "140px" }}>
                  Service
                </td>
                <td style={{ padding: "8px 0", color: "#1e293b", fontWeight: "600" }}>
                  {serviceLabel}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "8px 0", color: "#64748b" }}>Date</td>
                <td style={{ padding: "8px 0", color: "#1e293b" }}>{formattedDate}</td>
              </tr>
              <tr>
                <td style={{ padding: "8px 0", color: "#64748b" }}>Time</td>
                <td style={{ padding: "8px 0", color: "#1e293b" }}>{booking.time}</td>
              </tr>
              <tr>
                <td style={{ padding: "8px 0", color: "#64748b", verticalAlign: "top" }}>
                  Address
                </td>
                <td style={{ padding: "8px 0", color: "#1e293b" }}>{booking.address}</td>
              </tr>
              {booking.notes && (
                <tr>
                  <td style={{ padding: "8px 0", color: "#64748b", verticalAlign: "top" }}>
                    Notes
                  </td>
                  <td style={{ padding: "8px 0", color: "#1e293b" }}>{booking.notes}</td>
                </tr>
              )}
              <tr>
                <td style={{ padding: "8px 0", color: "#64748b" }}>Status</td>
                <td style={{ padding: "8px 0", color: "#118C3A", fontWeight: "600" }}>
                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1).replace("_", " ")}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p
          style={{
            fontSize: "14px",
            color: "#64748b",
            margin: "0 0 16px 0",
            lineHeight: 1.6,
          }}
        >
          A technician will be assigned to your booking. You will receive further updates if there are any changes.
        </p>
        <p
          style={{
            fontSize: "14px",
            color: "#64748b",
            margin: "0",
            lineHeight: 1.6,
          }}
        >
          If you need to reschedule or have any questions, please contact us at{" "}
          <a
            href="mailto:support@greenskysolar.com"
            style={{ color: "#118C3A", textDecoration: "none", fontWeight: "600" }}
          >
            support@greenskysolar.com
          </a>
          .
        </p>
      </div>

      {/* Footer */}
      <div
        style={{
          backgroundColor: "#f8fafc",
          padding: "20px 32px",
          textAlign: "center",
          fontSize: "12px",
          color: "#94a3b8",
        }}
      >
        © {new Date().getFullYear()} GreenSky Solar. All rights reserved.
      </div>
    </div>
  );
}
