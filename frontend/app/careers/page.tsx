"use client";

import { Mail, User, MessageSquare } from "lucide-react";
import { useState } from "react";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className=" bg-[#E7E4DF] text-[#172a46]">
      {/* Hero */}
      <section className="pt-24 pb-16 bg-[#E7E4DF]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 font-berlin">
            Careers
          </h1>
          <p className="text-[#172a46] text-lg max-w-2xl mx-auto">
            Coming Soon.
          </p>
        </div>
      </section>

      {/* Form Section */}
    </div>
  );
}
