import Link from "next/link";
import { BookingConfirmationEmail } from "@/components/email/BookingConfirmationEmail";
import type { Booking } from "@/types/client";

// Sample booking for preview
const sampleBooking: Booking = {
  id: "book-sample-123",
  referenceNo: "BK-0042",
  serviceType: "site_inspection",
  date: "2025-02-20",
  time: "09:00 AM",
  status: "confirmed",
  technician: "Juan Dela Cruz",
  address: "123 Solar Street, Barangay Malinis, Quezon City, Metro Manila",
  notes: "Please bring ladder for roof access. Gate code: 1234",
  amount: 0,
};

export default function BookingConfirmationPreviewPage() {
  return (
    <div className="min-h-screen bg-slate-200 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-slate-800">
            Booking Confirmation Email Preview
          </h1>
          <Link
            href="/"
            className="text-sm text-brand hover:underline font-medium"
          >
            Back to Home
          </Link>
        </div>
        <p className="text-sm text-slate-600 mb-6">
          This is how the booking confirmation email will appear when sent to customers.
        </p>
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <BookingConfirmationEmail
            booking={sampleBooking}
            customerName="Maria Santos"
          />
        </div>
      </div>
    </div>
  );
}
