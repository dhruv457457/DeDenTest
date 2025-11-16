"use client";

import { Mail, User, MessageSquare } from "lucide-react";
import { useState } from "react";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen bg-[#172a46] text-white">
      {/* Hero */}
      <section className="pt-24 pb-16 bg-[#172a46]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 font-berlin">
            Contact Us
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Have a question about our stays, bookings, or partnerships? We’re
            here to help you 24/7.
          </p>
        </div>
      </section>

      {/* Form Section */}
      <section className="bg-[#E7E4DF]">
        <div className="max-w-3xl mx-auto px-6 py-20">
          <div className="bg-white rounded-3xl shadow-2xl p-10 md:p-16 border-4 border-[#172a46]">
            <h2 className="text-3xl font-bold text-[#172a46] mb-8 text-center">
              Send Us a Message
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setLoading(true);
                setTimeout(() => setLoading(false), 1200);
              }}
              className="space-y-8"
            >
              {/* Name */}
              <div>
                <label className="flex items-center gap-2 text-lg font-bold text-[#172a46] mb-3">
                  <User size={20} />
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  className="w-full px-5 py-4 text-lg border-2 border-gray-300 rounded-2xl focus:border-[#172a46] focus:outline-none transition-colors"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="flex items-center gap-2 text-lg font-bold text-[#172a46] mb-3">
                  <Mail size={20} />
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="w-full px-5 py-4 text-lg border-2 border-gray-300 rounded-2xl focus:border-[#172a46] focus:outline-none transition-colors"
                  required
                />
              </div>

              {/* Query / Message */}
              <div>
                <label className="flex items-center gap-2 text-lg font-bold text-[#172a46] mb-3">
                  <MessageSquare size={20} />
                  Your Message
                </label>
                <textarea
                  placeholder="Write your query here..."
                  rows={5}
                  className="w-full px-5 py-4 text-lg border-2 border-gray-300 rounded-2xl focus:border-[#172a46] focus:outline-none transition-colors resize-none"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full text-lg font-semibold py-5 rounded-full inline-flex items-center justify-center gap-3 transition-all shadow-xl
                  ${
                    loading
                      ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                      : "bg-[#172a46] text-white hover:scale-[1.03]"
                  }
                `}
              >
                {loading ? (
                  <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Send Message"
                )}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
